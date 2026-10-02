"use client";

/**
 * LDMF-247 - página de debug TEMPORÁRIA. Branch própria, nunca mergeada.
 *
 * Mede como o backend agrupa linhas do carrinho (observação, complemento)
 * disparando as ações pelos MESMOS handlers do app (useCartActions): o
 * "Adicionar" é o handleAddToCart que o modal do prato chama, o "+"/"–" é o
 * handleUpdateQuantity da página do carrinho. A página não monta body
 * nenhum - intercepta o fetch e registra a requisição e a resposta cruas.
 */

import { useCartActions } from "@/hooks/use-cart-actions";
import { useCompanyProducts } from "@/hooks/use-products";
import { usePublicProductAddOns } from "@/hooks/use-product-add-ons";
import { useRestaurants } from "@/hooks/use-restaurants";
import { apiService } from "@/services/api";
import { useAuthStore, useCartStore } from "@/stores";
import { useEffect, useRef, useState } from "react";

type NetworkCall = {
  method: string;
  url: string;
  requestBody: unknown;
  status: number | null;
  responseBody: unknown;
};

type StepLog = {
  scenario: string;
  step: string;
  at: string;
  // Requisições que a ação do app disparou (POST/DELETE do carrinho etc.)
  actionCalls: NetworkCall[];
  // Leituras feitas depois da ação, para ver o estado do backend
  snapshot: {
    orderId: string | null;
    orderItemByOrder: NetworkCall | null;
    orderItemByOrderEncoded: NetworkCall | null;
    order: NetworkCall | null;
    frontItems: unknown;
  };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const parseBody = (body: unknown) => {
  if (typeof body !== "string") return body ?? null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

// ---- Interceptação do fetch: só registra, não altera nada ----
let recording: NetworkCall[] | null = null;
let inFlight = 0;

function installFetchSpy() {
  const original = window.fetch;
  const spy: typeof window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const tracked = url.includes("/api/proxy/");
    if (!tracked) return original(input, init);

    const call: NetworkCall = {
      method: init?.method ?? "GET",
      url: url.replace(/^.*\/api\/proxy/, ""),
      requestBody: parseBody(init?.body),
      status: null,
      responseBody: null,
    };
    recording?.push(call);
    inFlight++;
    try {
      const response = await original(input, init);
      call.status = response.status;
      call.responseBody = parseBody(await response.clone().text());
      return response;
    } catch (error) {
      call.responseBody = { fetchError: String(error) };
      throw error;
    } finally {
      inFlight--;
    }
  };
  window.fetch = spy;
  return () => {
    if (window.fetch === spy) window.fetch = original;
  };
}

// Espera o debounce do "+" (300ms) e todas as requisições terminarem
async function waitForNetworkIdle() {
  await sleep(450);
  const deadline = Date.now() + 15000;
  while (inFlight > 0 && Date.now() < deadline) await sleep(50);
  await sleep(150);
}

async function rawGet(path: string): Promise<NetworkCall> {
  const call: NetworkCall = { method: "GET", url: path, requestBody: null, status: null, responseBody: null };
  const response = await fetch(`/api/proxy${path}`, {
    headers: { "Content-Type": "application/json", "X-Auth-Required": "1" },
    cache: "no-store",
  });
  call.status = response.status;
  call.responseBody = parseBody(await response.text());
  return call;
}

// POST cru, com os mesmos headers que o apiRequest manda (o proxy só injeta
// o token com X-Auth-Required). Usado só no cenário H, cujo body o app não
// sabe montar.
async function rawPost(path: string, body: unknown): Promise<void> {
  await fetch(`/api/proxy${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Required": "1" },
    body: JSON.stringify(body),
  });
}

const SCENARIOS = ["A", "B", "C", "D", "E", "F", "H"] as const;
type ScenarioId = (typeof SCENARIOS)[number];

const DESCRIPTIONS: Record<ScenarioId, string> = {
  A: "X sem observação, Adicionar 2x",
  B: 'X com "teste A", depois "+" na linha',
  C: 'X com "teste A", Adicionar 2x',
  D: 'X com "teste A", depois X com "teste B"',
  E: "X com complemento, depois X sem complemento",
  F: 'Estado de B, depois "–" na linha (DELETE 1)',
  H: 'X com "teste H" em "description" (não em "observations")',
};

export default function DebugCartPage() {
  const { user, isAuthenticated } = useAuthStore();
  const actions = useCartActions();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const [companyId, setCompanyId] = useState("");
  const [productId, setProductId] = useState("");
  const [addOnId, setAddOnId] = useState("");
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const restaurants = useRestaurants();
  const products = useCompanyProducts(companyId || null);
  const addOns = usePublicProductAddOns(productId || null, companyId || null);

  const restaurantList = restaurants.data ?? [];
  const productList = products.data ?? [];
  const addOnList = addOns.data ?? [];
  const restaurant = restaurantList.find((r) => r.id === companyId);
  const product = productList.find((p) => p.id === productId);
  const addOn = addOnList.find((a) => a.id === addOnId);

  useEffect(() => installFetchSpy(), []);

  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return null;

  // Os handlers do useCartActions leem orderId/items do closure do render.
  // Antes de cada ação, espera o hook ter renderizado com o estado atual do
  // store - senão o "Adicionar" abre outro carrinho e o "limpar" não chama
  // o backend, como um clique numa tela que ainda não atualizou.
  const waitForFreshActions = async () => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const store = useCartStore.getState();
      if (
        actionsRef.current.orderId === store.orderId &&
        actionsRef.current.items === store.items
      ) {
        return;
      }
      await sleep(50);
    }
    throw new Error("o hook do carrinho não renderizou com o estado atual");
  };

  // Executa uma ação do app, registra o que ela mandou e depois lê o backend
  const runStep = async (scenario: string, step: string, action: () => Promise<unknown>) => {
    await waitForFreshActions();
    const actionCalls: NetworkCall[] = [];
    recording = actionCalls;
    try {
      await action();
      await waitForNetworkIdle();
    } finally {
      recording = null;
    }

    const orderId = useCartStore.getState().orderId;
    const snapshot: StepLog["snapshot"] = {
      orderId,
      orderItemByOrder: null,
      orderItemByOrderEncoded: null,
      order: null,
      frontItems: useCartStore.getState().items,
    };
    if (orderId) {
      // Sem encode (como as rotas /order-item/cart mandam o `cart:`) e com
      // encode (como apiService.orderItems.listByOrder monta hoje)
      snapshot.orderItemByOrder = await rawGet(`/order-item/order/${orderId}`);
      snapshot.orderItemByOrderEncoded = await rawGet(
        `/order-item/order/${encodeURIComponent(orderId)}`,
      );
      snapshot.order = await rawGet(`/order/${orderId}`);
    }

    setLogs((prev) => [
      ...prev,
      { scenario, step, at: new Date().toISOString(), actionCalls, snapshot },
    ]);
    // Deixa o React renderizar: os handlers seguintes precisam do closure novo
    await sleep(200);
  };

  // Mesmo formato que o modal do prato passa para handleAddToCart
  const addX = (opts: { observation?: string; withAddOn?: boolean }) => () =>
    actionsRef.current.handleAddToCart({
      id: product!.id,
      name: product!.name,
      price: product!.salePrice,
      image: product!.imageURL?.[0]?.url || "/placeholder.svg",
      restaurantId: restaurant!.id,
      restaurantName: restaurant!.tradeName,
      specialInstructions: opts.observation ?? "",
      quantity: 1,
      variations: undefined,
      addOns: opts.withAddOn ? [{ productAddOnsId: addOn!.id, quantity: 1 }] : undefined,
      variationLabel: undefined,
      addOnLabels: opts.withAddOn ? [addOn!.name] : undefined,
    });

  // Como a página do carrinho: handleUpdateQuantity(item.id, item.quantity ± 1)
  const stepQuantity = (delta: 1 | -1) => async () => {
    const line = actionsRef.current.items.find((i) => i.productId === product!.id);
    if (!line) throw new Error("linha de X não encontrada no carrinho do front");
    await actionsRef.current.handleUpdateQuantity(line.id, line.quantity + delta);
  };

  const clearCart = () => actionsRef.current.handleClearCart(false);

  // Cenário H: o "Adicionar" do app só sabe mandar `observations`, então o
  // body é montado aqui - os mesmos campos que apiService.orderItems.
  // addProductToCart manda para X sem complemento nem tamanho (orderId,
  // productId, quantity), com `description` no lugar de `observations`.
  // O carrinho é aberto como o handleAddToCart abre (mesmo openCart e body).
  const addXWithDescription = (description: string) => async () => {
    let orderId = useCartStore.getState().orderId;
    if (!orderId) {
      const opened = await apiService.orders.openCart(user!.id, {
        companyId: restaurant!.id,
        discount: 0,
        totalShipping: 0,
        totalValue: 0,
        status: "CART",
      });
      if (!opened.success || !opened.data?.id) throw new Error("falha ao abrir o carrinho");
      orderId = opened.data.id;
      useCartStore.getState().setOrderId(orderId);
    }
    await rawPost("/order-item/cart", {
      orderId,
      productId: product!.id,
      quantity: 1,
      description,
    });
  };

  const runScenario = async (id: ScenarioId) => {
    const s = `${id} - ${DESCRIPTIONS[id]}`;
    await runStep(s, "0. limpar carrinho", clearCart);
    switch (id) {
      case "A":
        await runStep(s, "1. Adicionar X", addX({}));
        await runStep(s, "2. Adicionar X", addX({}));
        break;
      case "B":
        await runStep(s, '1. Adicionar X "teste A"', addX({ observation: "teste A" }));
        await runStep(s, '2. "+" na linha', stepQuantity(1));
        break;
      case "C":
        await runStep(s, '1. Adicionar X "teste A"', addX({ observation: "teste A" }));
        await runStep(s, '2. Adicionar X "teste A"', addX({ observation: "teste A" }));
        break;
      case "D":
        await runStep(s, '1. Adicionar X "teste A"', addX({ observation: "teste A" }));
        await runStep(s, '2. Adicionar X "teste B"', addX({ observation: "teste B" }));
        break;
      case "E":
        await runStep(s, "1. Adicionar X com complemento", addX({ withAddOn: true }));
        await runStep(s, "2. Adicionar X sem complemento", addX({}));
        break;
      case "F":
        await runStep(s, '1. Adicionar X "teste A"', addX({ observation: "teste A" }));
        await runStep(s, '2. "+" na linha', stepQuantity(1));
        await runStep(s, '3. "–" na linha', stepQuantity(-1));
        break;
      case "H":
        await runStep(
          s,
          '1. Adicionar X com description "teste H"',
          addXWithDescription("teste H"),
        );
        break;
    }
  };

  const run = async (ids: readonly ScenarioId[]) => {
    setRunning(ids.join(","));
    try {
      for (const id of ids) {
        try {
          await runScenario(id);
        } catch (error) {
          setLogs((prev) => [
            ...prev,
            {
              scenario: id,
              step: "ERRO",
              at: new Date().toISOString(),
              actionCalls: [],
              snapshot: {
                orderId: null,
                orderItemByOrder: null,
                orderItemByOrderEncoded: null,
                order: null,
                frontItems: String(error),
              },
            },
          ]);
        }
      }
    } finally {
      setRunning(null);
    }
  };

  const fullLog = JSON.stringify(
    {
      ticket: "LDMF-247",
      userId: user?.id,
      companyId,
      productId,
      addOnId,
      logs,
    },
    null,
    2,
  );

  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(fullLog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!isAuthenticated || !user) {
    return <p className="p-4 text-sm">Faça login com a conta client de teste.</p>;
  }

  const ready = !!restaurant && !!product && !running;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 text-sm">
      <h1 className="text-lg font-bold">Debug carrinho - LDMF-247</h1>
      <p className="text-muted-foreground">
        Usuário: {user.id} ({user.role})
      </p>

      <label className="block space-y-1">
        <span className="font-semibold">Empresa</span>
        <select
          className="w-full rounded border bg-card p-2"
          value={companyId}
          onChange={(e) => {
            setCompanyId(e.target.value);
            setProductId("");
            setAddOnId("");
          }}
        >
          <option value="">{restaurants.isLoading ? "Carregando..." : "Escolha"}</option>
          {restaurantList.map((r) => (
            <option key={r.id} value={r.id}>
              {r.tradeName}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">Produto X</span>
        <select
          className="w-full rounded border bg-card p-2"
          value={productId}
          disabled={!companyId}
          onChange={(e) => {
            setProductId(e.target.value);
            setAddOnId("");
          }}
        >
          <option value="">{products.isLoading ? "Carregando..." : "Escolha"}</option>
          {productList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">Complemento (cenário E)</span>
        <select
          className="w-full rounded border bg-card p-2"
          value={addOnId}
          disabled={!productId}
          onChange={(e) => setAddOnId(e.target.value)}
        >
          <option value="">
            {addOns.isLoading ? "Carregando..." : addOnList.length ? "Escolha" : "Produto sem complemento"}
          </option>
          {addOnList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((id) => (
          <button
            key={id}
            type="button"
            disabled={!ready || (id === "E" && !addOn)}
            onClick={() => run([id])}
            className="rounded border bg-card p-2 text-left disabled:opacity-40"
          >
            <span className="font-bold">{id}</span> {DESCRIPTIONS[id]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready || !addOn}
          onClick={() => run(SCENARIOS)}
          className="rounded bg-foreground px-3 py-2 font-semibold text-background disabled:opacity-40"
        >
          Rodar todos
        </button>
        <button type="button" onClick={copyLog} className="rounded border px-3 py-2">
          {copied ? "Copiado" : "Copiar log"}
        </button>
        <button
          type="button"
          disabled={!!running}
          onClick={() => setLogs([])}
          className="rounded border px-3 py-2 disabled:opacity-40"
        >
          Limpar log
        </button>
      </div>

      {running && <p className="font-semibold">Rodando {running}...</p>}

      <section className="space-y-2">
        {logs.map((log, index) => (
          <details key={index} className="rounded border p-2" open={index === logs.length - 1}>
            <summary className="cursor-pointer font-semibold">
              {log.scenario} · {log.step}
            </summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px]">
              {JSON.stringify(log, null, 2)}
            </pre>
          </details>
        ))}
      </section>

      <label className="block space-y-1">
        <span className="font-semibold">Log completo (para copiar à mão se o botão falhar)</span>
        <textarea readOnly value={fullLog} className="h-48 w-full rounded border bg-card p-2 font-mono text-[11px]" />
      </label>
    </main>
  );
}

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAuthStore, type User } from "@/stores/auth-store";

import { bindQueryCacheToUser } from "./query-cache-session";

const initialAuthState = useAuthStore.getState();

function makeUser(id: string): User {
  return {
    id,
    name: `Funcionario ${id}`,
    email: `${id}@example.com`,
    cpf: "",
    phone: "",
    birthDate: "",
    role: "owner",
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Backend falso: responde com a conta logada no momento da requisição
let requests: string[] = [];
let kitchenVersion = 0;

function currentUserId() {
  return useAuthStore.getState().user?.id ?? "anonimo";
}

// Mesmas opções do Providers: é o que faz o cache vazar sem refetch
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60 * 1000, refetchOnMount: false, retry: false },
    },
  });
}

// Chave sem usuário, como a dos pedidos da empresa
function CompanyOrders() {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ["company-orders"],
    queryFn: async () => {
      const id = currentUserId();
      requests.push(`company-orders:${id}`);
      await wait(5);
      return `pedidos-${id}`;
    },
    enabled: !!user,
  });
  return <p data-testid="orders">{data ?? "vazio"}</p>;
}

// Tela que não depende do usuário e só atualiza pelo socket
function KitchenOrders() {
  const { data } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: async () => {
      requests.push(`kitchen-orders:${currentUserId()}`);
      await wait(5);
      return `cozinha-v${kitchenVersion}`;
    },
  });
  return <p data-testid="kitchen">{data ?? "vazio"}</p>;
}

function renderWith(queryClient: QueryClient, ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

describe("cache do TanStack Query x sessão (LDMF-244)", () => {
  let queryClient: QueryClient;
  let unbind: () => void;

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(initialAuthState, true);
    requests = [];
    kitchenVersion = 0;
    queryClient = makeClient();
    unbind = bindQueryCacheToUser(queryClient);
  });

  afterEach(() => {
    unbind();
    queryClient.clear();
  });

  it("conta B entrando depois da A não recebe o cache da A", async () => {
    act(() => useAuthStore.getState().login(makeUser("a")));
    const { unmount } = renderWith(queryClient, <CompanyOrders />);
    await screen.findByText("pedidos-a");

    act(() => useAuthStore.getState().logout());
    unmount();
    act(() => useAuthStore.getState().login(makeUser("b")));
    renderWith(queryClient, <CompanyOrders />);

    expect(text("orders")).toBe("vazio");
    await screen.findByText("pedidos-b");
  });

  it("troca direta de conta, sem passar pelo logout, também limpa", async () => {
    act(() => useAuthStore.getState().login(makeUser("a")));
    renderWith(queryClient, <CompanyOrders />);
    await screen.findByText("pedidos-a");

    act(() => useAuthStore.getState().login(makeUser("b")));

    expect(text("orders")).toBe("vazio");
    await screen.findByText("pedidos-b");
  });

  it("logout tira o dado da tela que ficou montada, sem nova requisição", async () => {
    act(() => useAuthStore.getState().login(makeUser("a")));
    renderWith(queryClient, <CompanyOrders />);
    await screen.findByText("pedidos-a");
    requests = [];

    // 401: a tela segue montada atrás do modal de login
    act(() => useAuthStore.getState().logout());
    await act(() => wait(20));

    expect(text("orders")).toBe("vazio");
    // Refetch aqui sairia com o cookie da conta que está saindo
    expect(requests).toEqual([]);
  });

  it("tela montada segue recebendo invalidação do socket depois do relogin", async () => {
    act(() => useAuthStore.getState().login(makeUser("a")));
    renderWith(queryClient, <KitchenOrders />);
    await screen.findByText("cozinha-v0");

    act(() => useAuthStore.getState().logout());
    await act(() => wait(20));
    expect(text("kitchen")).toBe("vazio");
    act(() => useAuthStore.getState().login(makeUser("a")));
    await screen.findByText("cozinha-v0");

    kitchenVersion = 1;
    await act(() =>
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] }),
    );

    await screen.findByText("cozinha-v1");
  });

  it("login refaz as queries ativas com a conta nova", async () => {
    act(() => useAuthStore.getState().login(makeUser("a")));
    renderWith(queryClient, <KitchenOrders />);
    await screen.findByText("cozinha-v0");

    act(() => useAuthStore.getState().logout());
    await act(() => wait(20));
    expect(text("kitchen")).toBe("vazio");
    requests = [];

    act(() => useAuthStore.getState().login(makeUser("b")));
    await screen.findByText("cozinha-v0");

    expect(requests).toEqual(["kitchen-orders:b"]);
  });

  it("resposta da conta A que chega depois do logout não entra no cache", async () => {
    act(() => useAuthStore.getState().login(makeUser("a")));
    let respond: (value: string) => void = () => {};
    const pending = queryClient
      .fetchQuery({
        queryKey: ["financial"],
        queryFn: () => new Promise<string>((r) => (respond = r)),
      })
      .catch(() => "cancelada");

    act(() => useAuthStore.getState().logout());
    respond("financeiro-a");

    expect(await pending).toBe("cancelada");
    expect(queryClient.getQueryData(["financial"])).toBeUndefined();
  });

  it("atualizar o perfil da mesma conta não mexe no cache", async () => {
    act(() => useAuthStore.getState().login(makeUser("a")));
    renderWith(queryClient, <CompanyOrders />);
    await screen.findByText("pedidos-a");
    requests = [];

    act(() => useAuthStore.getState().updateUser({ name: "Novo nome" }));
    await act(() => wait(20));

    expect(text("orders")).toBe("pedidos-a");
    expect(requests).toEqual([]);
  });
});

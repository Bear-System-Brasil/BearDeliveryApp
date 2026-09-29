import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import { useAuthStore } from "@/stores";
import { useOrderHistory } from "./use-order-history";
import { useCancelOrder, useUserOrders } from "./use-orders";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    apiService: {
      orders: {
        getCustomerOrders: vi.fn(),
        clearCart: vi.fn(),
      },
    },
  };
});

const orders = vi.mocked(apiService.orders);

const order = (id: string, status: string, createdAt: string) => ({
  id,
  status,
  created_at: createdAt,
});

const initialAuthState = useAuthStore.getState();
let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function respondWith(data: unknown) {
  orders.getCustomerOrders.mockResolvedValue({ success: true, data } as never);
}

async function loadUserOrders() {
  const hook = renderHook(() => useUserOrders(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  useAuthStore.setState(
    {
      ...initialAuthState,
      isAuthenticated: true,
      user: {
        id: "user-1",
        name: "Ana",
        email: "ana@example.com",
        cpf: "",
        phone: "",
        birthDate: "",
        role: "client",
      },
    },
    true,
  );
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

describe("useUserOrders", () => {
  it("ordena do pedido mais novo para o mais antigo", async () => {
    respondWith([
      order("velho", "COMPLETED", "2026-09-01T10:00:00Z"),
      order("novo", "ORDERED", "2026-09-28T10:00:00Z"),
      order("meio", "CANCELED", "2026-09-15T10:00:00Z"),
    ]);

    const { result } = await loadUserOrders();

    expect(result.current.data!.map((o) => o.id)).toEqual(["novo", "meio", "velho"]);
  });

  it.each([
    ["array cru", [order("a", "ORDERED", "2026-09-01T10:00:00Z")]],
    ["envelope data", { data: [order("a", "ORDERED", "2026-09-01T10:00:00Z")] }],
    ["envelope orders", { orders: [order("a", "ORDERED", "2026-09-01T10:00:00Z")] }],
    ["pedido único fora de array", order("a", "ORDERED", "2026-09-01T10:00:00Z")],
  ])("aceita %s", async (_label, payload) => {
    respondWith(payload);

    const { result } = await loadUserOrders();

    expect(result.current.data!.map((o) => o.id)).toEqual(["a"]);
  });

  it.each([
    ["corpo vazio", null],
    ["objeto sem lista", { meta: { total: 0 } }],
  ])("%s é lista vazia, não erro", async (_label, payload) => {
    respondWith(payload);

    const { result } = await loadUserOrders();

    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("não descarta nenhum status: carrinho e abandonado também aparecem", async () => {
    respondWith([
      order("c", "CART", "2026-09-01T10:00:00Z"),
      order("ab", "ABANDONED", "2026-09-02T10:00:00Z"),
    ]);

    const { result } = await loadUserOrders();

    expect(result.current.data).toHaveLength(2);
  });

  it("falha da chamada vira erro com a mensagem e o status HTTP", async () => {
    orders.getCustomerOrders.mockResolvedValue({ success: false, message: "Token expirado", status: 401 });

    const { result } = await loadUserOrders();

    expect(result.current.isError).toBe(true);
    expect(result.current.error!.message).toBe("Token expirado (HTTP 401)");
  });

  it("falha sem mensagem nem status usa o texto padrão", async () => {
    orders.getCustomerOrders.mockResolvedValue({ success: false });

    const { result } = await loadUserOrders();

    expect(result.current.error!.message).toBe("Não foi possível carregar seus pedidos");
  });

  it("sem login não consulta", () => {
    useAuthStore.setState({ ...initialAuthState, isAuthenticated: false }, true);

    renderHook(() => useUserOrders(), { wrapper });

    expect(orders.getCustomerOrders).not.toHaveBeenCalled();
  });

  it("volta a consultar ao remontar, mesmo com cache recente", async () => {
    respondWith([order("a", "COMPLETED", "2026-09-01T10:00:00Z")]);
    const first = await loadUserOrders();
    first.unmount();
    const calls = orders.getCustomerOrders.mock.calls.length;

    renderHook(() => useUserOrders(), { wrapper });

    await waitFor(() => expect(orders.getCustomerOrders.mock.calls.length).toBe(calls + 1));
  });

  it("com pedido em andamento, consulta de novo a cada 30s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    respondWith([order("a", "IN_PRODUCTION", "2026-09-01T10:00:00Z")]);
    await loadUserOrders();
    const calls = orders.getCustomerOrders.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => expect(orders.getCustomerOrders.mock.calls.length).toBe(calls + 1));
  });

  it("sem pedido em andamento, não fica consultando", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    respondWith([
      order("a", "COMPLETED", "2026-09-01T10:00:00Z"),
      order("b", "CANCELED", "2026-09-02T10:00:00Z"),
    ]);
    await loadUserOrders();
    const calls = orders.getCustomerOrders.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(90_000);
    });

    expect(orders.getCustomerOrders.mock.calls.length).toBe(calls);
  });
});

describe("useOrderHistory", () => {
  beforeEach(() => {
    respondWith([
      order("ativo", "READY_FOR_PICKUP", "2026-09-28T10:00:00Z"),
      order("feito", "COMPLETED", "2026-09-20T10:00:00Z"),
      order("cancelado", "CANCELED", "2026-09-10T10:00:00Z"),
      order("pagando", "AWAITING_PAYMENT", "2026-09-05T10:00:00Z"),
    ]);
  });

  async function loadHistory() {
    const hook = renderHook(() => useOrderHistory(), { wrapper });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook;
  }

  it("mostra todos por padrão", async () => {
    const { result } = await loadHistory();

    expect(result.current.filter).toBe("all");
    expect(result.current.orders.map((o) => o.id)).toEqual(["ativo", "feito", "cancelado", "pagando"]);
  });

  it("filtro 'active' mostra só os em andamento", async () => {
    const { result } = await loadHistory();

    act(() => result.current.setFilter("active"));

    expect(result.current.orders.map((o) => o.id)).toEqual(["ativo", "pagando"]);
    expect(result.current.allOrders).toHaveLength(4);
  });

  it("filtro 'completed' mostra o resto, cancelados inclusive", async () => {
    const { result } = await loadHistory();

    act(() => result.current.setFilter("completed"));

    expect(result.current.orders.map((o) => o.id)).toEqual(["feito", "cancelado"]);
  });

  it("repassa a mensagem de erro da consulta", async () => {
    orders.getCustomerOrders.mockResolvedValue({ success: false, message: "Fora do ar" });

    const { result } = await loadHistory();

    expect(result.current.error).toBe("Fora do ar");
    expect(result.current.orders).toEqual([]);
  });

  it("refreshHistory consulta de novo", async () => {
    const { result } = await loadHistory();
    const calls = orders.getCustomerOrders.mock.calls.length;

    act(() => result.current.refreshHistory());

    await waitFor(() => expect(orders.getCustomerOrders.mock.calls.length).toBe(calls + 1));
  });
});

describe("useCancelOrder", () => {
  it("usa o clearCart com o id do cliente logado e avisa o sucesso", async () => {
    orders.clearCart.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCancelOrder(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("o1");
    });

    expect(orders.clearCart).toHaveBeenCalledWith("user-1", "o1");
    expect(toast.success).toHaveBeenCalledWith("Pedido cancelado com sucesso!");
  });

  it("sem usuário logado, falha sem chamar a API", async () => {
    useAuthStore.setState({ ...initialAuthState, user: null }, true);
    const { result } = renderHook(() => useCancelOrder(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("o1").catch(() => {});
    });

    expect(orders.clearCart).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("User not authenticated");
  });

  it("exceção de rede mostra a mensagem do erro", async () => {
    orders.clearCart.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useCancelOrder(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("o1").catch(() => {});
    });

    expect(toast.error).toHaveBeenCalledWith("offline");
  });
});

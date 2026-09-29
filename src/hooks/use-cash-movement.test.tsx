import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import { useAuthStore } from "@/stores";
import {
  useCashDeposit,
  useCashMovements,
  useCashMovementSummary,
  useCashRefund,
  useCashSale,
  useCashWithdrawal,
} from "./use-cash-movement";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    apiService: {
      cashMovement: {
        getSummary: vi.fn(),
        list: vi.fn(),
        withdrawal: vi.fn(),
        deposit: vi.fn(),
        sale: vi.fn(),
        refund: vi.fn(),
      },
    },
  };
});

const cash = vi.mocked(apiService.cashMovement);

const initialAuthState = useAuthStore.getState();
let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  useAuthStore.setState({ ...initialAuthState, isAuthenticated: true }, true);
});

afterEach(() => {
  queryClient.clear();
});

describe("useCashMovementSummary", () => {
  it("devolve o resumo do caixa", async () => {
    cash.getSummary.mockResolvedValue({ success: true, data: { balance: 150 } } as never);

    const { result } = renderHook(() => useCashMovementSummary(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ balance: 150 }));
  });

  it.each([["Erro 404"], ["Caixa não encontrado"]])(
    "caixa ainda não aberto (%s) é null, não erro",
    async (message) => {
      cash.getSummary.mockResolvedValue({ success: false, message });

      const { result } = renderHook(() => useCashMovementSummary(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    },
  );

  it("outra falha vira erro com a mensagem do backend", async () => {
    cash.getSummary.mockResolvedValue({ success: false, message: "Sem permissão" });

    const { result } = renderHook(() => useCashMovementSummary(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error!.message).toBe("Sem permissão");
  });

  it("sem login não consulta", () => {
    useAuthStore.setState({ ...initialAuthState, isAuthenticated: false }, true);

    renderHook(() => useCashMovementSummary(), { wrapper });

    expect(cash.getSummary).not.toHaveBeenCalled();
  });
});

describe("useCashMovements", () => {
  it("repassa filtros e normaliza o envelope paginado", async () => {
    cash.list.mockResolvedValue({
      success: true,
      data: {
        data: [{ id: "m1" }, { id: "m2" }],
        meta: { page: 2, limit: 2, total: 9, totalPages: 5 },
      },
    } as never);
    const params = { page: 2, limit: 2, type: "WITHDRAWAL" } as never;

    const { result } = renderHook(() => useCashMovements(params), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cash.list).toHaveBeenCalledWith(params);
    expect(result.current.data!.items.map((m: { id: string }) => m.id)).toEqual(["m1", "m2"]);
    expect(result.current.data!.meta.totalPages).toBe(5);
  });

  it("aceita array cru", async () => {
    cash.list.mockResolvedValue({ success: true, data: [{ id: "m1" }] } as never);

    const { result } = renderHook(() => useCashMovements(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.items).toHaveLength(1);
  });

  it("desligado pela tela não consulta", () => {
    renderHook(() => useCashMovements(undefined, { enabled: false }), { wrapper });

    expect(cash.list).not.toHaveBeenCalled();
  });

  it("trocar de página mantém a tabela anterior até a nova chegar", async () => {
    cash.list.mockResolvedValueOnce({
      success: true,
      data: { data: [{ id: "p1" }], meta: { page: 1, limit: 1, total: 2, totalPages: 2 } },
    } as never);
    const { result, rerender } = renderHook(
      ({ page }) => useCashMovements({ page, limit: 1 } as never),
      { wrapper, initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    cash.list.mockReturnValue(new Promise(() => {}));
    rerender({ page: 2 });

    expect(result.current.data!.items.map((m: { id: string }) => m.id)).toEqual(["p1"]);
    expect(result.current.isPlaceholderData).toBe(true);
  });

  it("falha vira erro", async () => {
    cash.list.mockResolvedValue({ success: false });

    const { result } = renderHook(() => useCashMovements(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error!.message).toBe("Erro ao buscar movimentos do caixa");
  });
});

describe.each([
  {
    name: "sangria",
    hook: useCashWithdrawal,
    api: "withdrawal" as const,
    ok: "Sangria registrada com sucesso!",
    refused: "Erro ao registrar sangria",
    offline: "Erro de conexão ao registrar sangria",
  },
  {
    name: "suprimento",
    hook: useCashDeposit,
    api: "deposit" as const,
    ok: "Suprimento registrado com sucesso!",
    refused: "Erro ao registrar suprimento",
    offline: "Erro de conexão ao registrar suprimento",
  },
  {
    name: "venda manual",
    hook: useCashSale,
    api: "sale" as const,
    ok: "Venda manual registrada!",
    refused: "Erro ao registrar venda",
    offline: "Erro de conexão ao registrar venda",
  },
  {
    name: "reembolso",
    hook: useCashRefund,
    api: "refund" as const,
    ok: "Reembolso registrado com sucesso!",
    refused: "Erro ao registrar reembolso",
    offline: "Erro de conexão ao registrar reembolso",
  },
])("$name", ({ hook, api, ok, refused, offline }) => {
  const payload = { amount: 25.5, description: "teste" };

  it("manda o valor, avisa e atualiza resumo e extrato", async () => {
    cash[api].mockResolvedValue({ success: true } as never);
    cash.getSummary.mockResolvedValue({ success: true, data: { balance: 0 } } as never);
    cash.list.mockResolvedValue({ success: true, data: [] } as never);
    // Resumo e extrato montados, como na tela do caixa.
    renderHook(() => useCashMovementSummary(), { wrapper });
    renderHook(() => useCashMovements(), { wrapper });
    await waitFor(() => expect(cash.list).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(cash.getSummary).toHaveBeenCalledTimes(1));

    const { result } = renderHook(() => hook(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(payload as never);
    });

    expect(cash[api]).toHaveBeenCalledWith(payload);
    expect(toast.success).toHaveBeenCalledWith(ok);
    await waitFor(() => expect(cash.getSummary).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(cash.list).toHaveBeenCalledTimes(2));
  });

  it("recusa do backend mostra a mensagem e não atualiza nada", async () => {
    cash[api].mockResolvedValue({ success: false } as never);
    cash.getSummary.mockResolvedValue({ success: true, data: { balance: 0 } } as never);
    renderHook(() => useCashMovementSummary(), { wrapper });
    await waitFor(() => expect(cash.getSummary).toHaveBeenCalledTimes(1));

    const { result } = renderHook(() => hook(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(payload as never);
    });

    expect(toast.error).toHaveBeenCalledWith(refused);
    expect(toast.success).not.toHaveBeenCalled();
    // Nada foi gravado: resumo continua o mesmo, sem nova leitura.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(cash.getSummary).toHaveBeenCalledTimes(1);
  });

  it("exceção de rede avisa erro de conexão", async () => {
    cash[api].mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => hook(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(payload as never).catch(() => {});
    });

    expect(toast.error).toHaveBeenCalledWith(offline);
  });
});

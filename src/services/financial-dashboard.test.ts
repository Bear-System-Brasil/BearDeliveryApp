import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiService, PaymentStatus, type ReportsSummary } from "@/services/api";
import {
  averageTicket,
  cancellationRate,
  expenseBreakdown,
  fetchPendingPayments,
  fetchReport,
  FinancialDashboardError,
  getPeriodRange,
  getPreviousRange,
  isEmptyReport,
  margin,
  percentChange,
  stuckRevenue,
} from "./financial-dashboard";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    apiService: {
      reports: { getSummary: vi.fn() },
      payments: { findByStatus: vi.fn() },
    },
  };
});

// Só a parte local da data: o offset depende do fuso de quem roda o teste.
const day = (iso: string) => iso.slice(0, iso.lastIndexOf(":") - 3);
const OFFSET = /[+-]\d{2}:\d{2}$/;

describe("períodos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 31/03/2026 às 15h locais: fim de mês longo, logo depois de fevereiro curto.
    vi.setSystemTime(new Date(2026, 2, 31, 15, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getPeriodRange", () => {
    it("hoje vai do início ao fim do dia, com offset local", () => {
      const range = getPeriodRange("today");

      expect(day(range.startDate)).toBe("2026-03-31T00:00:00");
      expect(day(range.endDate)).toBe("2026-03-31T23:59:59.999");
      expect(range.startDate).toMatch(OFFSET);
      expect(range.endDate).toMatch(OFFSET);
    });

    it("7 dias conta hoje e os 6 anteriores", () => {
      const range = getPeriodRange("7d");

      expect(day(range.startDate)).toBe("2026-03-25T00:00:00");
      expect(day(range.endDate)).toBe("2026-03-31T23:59:59.999");
    });

    it("este mês vai do dia 1 até hoje", () => {
      const range = getPeriodRange("month");

      expect(day(range.startDate)).toBe("2026-03-01T00:00:00");
      expect(day(range.endDate)).toBe("2026-03-31T23:59:59.999");
    });

    it("mês anterior pega o mês inteiro, até o último dia", () => {
      const range = getPeriodRange("previous-month");

      expect(day(range.startDate)).toBe("2026-02-01T00:00:00");
      expect(day(range.endDate)).toBe("2026-02-28T23:59:59.999");
    });

    it("personalizado usa as datas do input, inclusivas", () => {
      const range = getPeriodRange("custom", { from: "2026-01-10", to: "2026-01-20" });

      expect(day(range.startDate)).toBe("2026-01-10T00:00:00");
      expect(day(range.endDate)).toBe("2026-01-20T23:59:59.999");
    });

    it.each([
      ["sem data final", { from: "2026-01-10", to: "" }],
      ["invertido", { from: "2026-01-20", to: "2026-01-10" }],
      ["formato inválido", { from: "10/01/2026", to: "2026-01-20" }],
    ])("personalizado %s cai no mês atual", (_label, custom) => {
      expect(getPeriodRange("custom", custom)).toEqual(getPeriodRange("month"));
    });

    it("personalizado de um dia só é válido", () => {
      const range = getPeriodRange("custom", { from: "2026-01-10", to: "2026-01-10" });

      expect(day(range.startDate)).toBe("2026-01-10T00:00:00");
      expect(day(range.endDate)).toBe("2026-01-10T23:59:59.999");
    });
  });

  describe("getPreviousRange", () => {
    it("este mês compara com o mesmo trecho do mês anterior, sem 31 de fevereiro virar março", () => {
      const range = getPreviousRange("month");

      expect(day(range.startDate)).toBe("2026-02-01T00:00:00");
      expect(day(range.endDate)).toBe("2026-02-28T23:59:59.999");
    });

    it("mês anterior compara com o mês antes dele", () => {
      const range = getPreviousRange("previous-month");

      expect(day(range.startDate)).toBe("2026-01-01T00:00:00");
      expect(day(range.endDate)).toBe("2026-01-31T23:59:59.999");
    });

    it("7 dias compara com os 7 dias anteriores, terminando na véspera", () => {
      const range = getPreviousRange("7d");

      expect(day(range.startDate)).toBe("2026-03-18T00:00:00");
      expect(day(range.endDate)).toBe("2026-03-24T23:59:59.999");
    });

    it("hoje compara com ontem", () => {
      const range = getPreviousRange("today");

      expect(day(range.startDate)).toBe("2026-03-30T00:00:00");
      expect(day(range.endDate)).toBe("2026-03-30T23:59:59.999");
    });

    it("personalizado recua a própria duração", () => {
      const range = getPreviousRange("custom", { from: "2026-01-11", to: "2026-01-20" });

      expect(day(range.startDate)).toBe("2026-01-01T00:00:00");
      expect(day(range.endDate)).toBe("2026-01-10T23:59:59.999");
    });
  });
});

describe("contas do painel", () => {
  it("percentChange devolve fração e null sem base", () => {
    expect(percentChange(150, 100)).toBe(0.5);
    expect(percentChange(50, 100)).toBe(-0.5);
    expect(percentChange(100, 0)).toBeNull();
  });

  it("margin é a sobra sobre a receita, null sem receita", () => {
    expect(margin(200, 150)).toBe(0.25);
    expect(margin(100, 130)).toBeCloseTo(-0.3);
    expect(margin(0, 50)).toBeNull();
  });

  it("averageTicket é receita por pedido, null sem pedido", () => {
    expect(averageTicket(300, 4)).toBe(75);
    expect(averageTicket(300, 0)).toBeNull();
  });

  it("stuckRevenue soma só pedidos feitos e ainda não realizados", () => {
    const rows = [
      { status: "ORDERED", totalRevenue: 100, totalOrders: 1 },
      { status: "in_production", totalRevenue: 50, totalOrders: 1 },
      { status: "READY_FOR_PICKUP", totalRevenue: 25, totalOrders: 1 },
      { status: "AWAITING_PAYMENT", totalRevenue: 10, totalOrders: 1 },
      { status: "COMPLETED", totalRevenue: 1000, totalOrders: 9 },
      { status: "CANCELED", totalRevenue: 70, totalOrders: 1 },
      // Carrinho nunca virou venda: não pode inflar a receita presa.
      { status: "CART", totalRevenue: 500, totalOrders: 3 },
      { status: "ABANDONED", totalRevenue: 300, totalOrders: 2 },
      { status: "STATUS_NOVO", totalRevenue: 999, totalOrders: 1 },
    ];

    expect(stuckRevenue(rows as never)).toBe(185);
    expect(stuckRevenue([])).toBe(0);
    expect(stuckRevenue(undefined)).toBe(0);
  });

  it("cancellationRate aceita as duas grafias de cancelado", () => {
    const result = cancellationRate([
      { status: "COMPLETED", totalOrders: 16 },
      { status: "CANCELED", totalOrders: 3 },
      { status: "cancelled", totalOrders: 1 },
    ]);

    expect(result).toEqual({ count: 4, rate: 0.2 });
  });

  it("cancellationRate sem pedidos devolve taxa null", () => {
    expect(cancellationRate([])).toEqual({ count: 0, rate: null });
    expect(cancellationRate([{ status: "CANCELED", totalOrders: 0 }])).toEqual({ count: 0, rate: null });
  });

  it("expenseBreakdown ordena do maior para o menor e fecha 100% entre as partes", () => {
    const slices = expenseBreakdown({
      ingredientsCost: 50,
      productsCost: 30,
      shippingCost: 20,
      discounts: 0,
      // Total do backend maior que a soma: as barras seguem fechando 100%.
      totalExpenses: 130,
    });

    expect(slices.map((s) => [s.label, s.value, s.share])).toEqual([
      ["Ingredientes", 50, 0.5],
      ["Produtos", 30, 0.3],
      ["Entregas", 20, 0.2],
      ["Descontos", 0, 0],
    ]);
  });

  it("expenseBreakdown ignora valor negativo na participação", () => {
    const slices = expenseBreakdown({
      ingredientsCost: 40,
      productsCost: -10,
      shippingCost: 0,
      discounts: 0,
      totalExpenses: 30,
    });

    expect(slices.find((s) => s.key === "ingredientsCost")!.share).toBe(1);
    expect(slices.find((s) => s.key === "productsCost")!.share).toBe(0);
  });

  it("expenseBreakdown sem despesas não divide por zero", () => {
    expect(expenseBreakdown(undefined)).toEqual([]);
    const slices = expenseBreakdown({
      ingredientsCost: 0,
      productsCost: 0,
      shippingCost: 0,
      discounts: 0,
      totalExpenses: 0,
    });
    expect(slices.every((s) => s.share === 0)).toBe(true);
  });

  it("isEmptyReport só é vazio sem receita, pedido, despesa, série e produtos", () => {
    const empty = {
      totalRevenue: 0,
      totalOrders: 0,
      totalExpenses: { totalExpenses: 0 },
      revenueByDay: [],
      topProducts: [],
    } as unknown as ReportsSummary;

    expect(isEmptyReport(null)).toBe(true);
    expect(isEmptyReport(empty)).toBe(true);
    expect(isEmptyReport({ ...empty, totalOrders: 1 })).toBe(false);
    expect(isEmptyReport({ ...empty, revenueByDay: [{}] } as never)).toBe(false);
    expect(isEmptyReport({ ...empty, totalExpenses: { totalExpenses: 5 } } as never)).toBe(false);
    expect(isEmptyReport({ ...empty, topProducts: [{}] } as never)).toBe(false);
    expect(isEmptyReport({ ...empty, totalRevenue: 1 })).toBe(false);
  });
});

describe("busca", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchReport repassa o período e devolve o relatório", async () => {
    const report = { totalRevenue: 10 } as ReportsSummary;
    vi.mocked(apiService.reports.getSummary).mockResolvedValue({ success: true, data: report });
    const range = { startDate: "a", endDate: "b" };

    await expect(fetchReport(range)).resolves.toBe(report);
    expect(apiService.reports.getSummary).toHaveBeenCalledWith(range);
  });

  it("fetchReport recusado vira FinancialDashboardError com status", async () => {
    vi.mocked(apiService.reports.getSummary).mockResolvedValue({
      success: false,
      message: "Sem permissão",
      status: 403,
    });

    const error = await fetchReport({ startDate: "a", endDate: "b" }).catch((e) => e);

    expect(error).toBeInstanceOf(FinancialDashboardError);
    expect(error.message).toBe("Sem permissão");
    expect(error.status).toBe(403);
  });

  it("fetchPendingPayments conta pelo meta.total e soma a página lida", async () => {
    vi.mocked(apiService.payments.findByStatus).mockResolvedValue({
      success: true,
      data: {
        data: [{ amount: 30 }, { amount: 12.5 }, { amount: undefined }],
        meta: { page: 1, limit: 100, total: 250, totalPages: 3 },
      },
    } as never);

    const pending = await fetchPendingPayments();

    expect(apiService.payments.findByStatus).toHaveBeenCalledWith(PaymentStatus.PENDING, {
      page: 1,
      limit: 100,
    });
    expect(pending).toEqual({ count: 250, amount: 42.5, partialAmount: true });
  });

  it("fetchPendingPayments aceita array cru e marca a soma como completa", async () => {
    vi.mocked(apiService.payments.findByStatus).mockResolvedValue({
      success: true,
      data: [{ amount: 10 }, { amount: 5 }],
    } as never);

    await expect(fetchPendingPayments()).resolves.toEqual({
      count: 2,
      amount: 15,
      partialAmount: false,
    });
  });

  it("fetchPendingPayments recusado usa a mensagem padrão", async () => {
    vi.mocked(apiService.payments.findByStatus).mockResolvedValue({ success: false });

    await expect(fetchPendingPayments()).rejects.toThrow(
      "Não foi possível carregar os pagamentos pendentes.",
    );
  });
});

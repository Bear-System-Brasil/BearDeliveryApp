import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Delivery } from "@/services/api";
import DeliveryDashboardPage from "./page";

// Corrida aceita com um pagamento de débito a receber.
const ACCEPTED: Delivery = {
  id: "del-1",
  orderId: "order-aaaaaaaa",
  status: "ACCEPTED",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  order: {
    status: "READY_FOR_PICKUP",
    totalValue: 35.9,
    payments: [
      {
        id: "pay-1",
        orderId: "order-aaaaaaaa",
        customerId: "cus-1",
        amount: 35.9,
        paymentMethod: "DEBIT_CARD",
        status: "PENDING",
      },
    ],
  },
} as unknown as Delivery;

// Referências estáveis: identidade nova a cada render causa laço infinito.
const { driver, confirmation, position, auth, flags } = vi.hoisted(() => ({
  driver: { current: {} as Record<string, unknown> },
  confirmation: { shouldConfirm: false, setSkipConfirm: () => {} },
  position: { position: null, resolvePosition: async () => ({ ok: false }) },
  auth: { user: { role: "manager" } as { role: string } | null },
  flags: { requestEnabled: false },
}));

vi.mock("@/hooks/use-delivery-driver", () => ({
  useDeliveryDriver: () => driver.current,
}));
vi.mock("@/hooks/use-accept-confirmation", () => ({
  useAcceptConfirmation: () => confirmation,
}));
vi.mock("@/hooks/use-courier-position", () => ({
  useCourierPosition: () => position,
}));
vi.mock("@/stores", () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));
vi.mock("@/services/manager-requests", () => ({
  get PAYMENT_CHANGE_REQUEST_ENABLED() {
    return flags.requestEnabled;
  },
}));
vi.mock("@/components/delivery-dashboard/accept-confirm-dialog", () => ({
  AcceptConfirmDialog: () => null,
}));
vi.mock("@/components/delivery-dashboard/return-dialog", () => ({
  ReturnDialog: () => null,
}));
vi.mock("@/components/delivery-dashboard/location-dialog", () => ({
  LocationDialog: () => null,
}));

const changePaymentMethod = vi.fn();
const requestPaymentChange = vi.fn();

function setDriver() {
  driver.current = {
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    inRouteDeliveries: [],
    toPickUpDeliveries: [ACCEPTED],
    availableDeliveries: [],
    soundEnabled: true,
    toggleSound: vi.fn(),
    acceptDelivery: vi.fn(),
    acceptingId: null,
    advanceDelivery: vi.fn(),
    advancingId: null,
    returnDelivery: vi.fn(),
    returningId: null,
    isReturning: false,
    changePaymentMethod,
    requestPaymentChange,
    changingPaymentId: null,
    isChangingPayment: false,
    hasMorePages: false,
    counts: { mine: 1, inRoute: 0, toPickUp: 1, recent: 0, available: 0 },
  };
}

describe("DeliveryDashboardPage - forma de pagamento", () => {
  beforeEach(() => {
    changePaymentMethod.mockReset();
    requestPaymentChange.mockReset();
    auth.user = { role: "manager" };
    flags.requestEnabled = false;
    setDriver();
  });

  it.each(["owner", "admin", "manager"])(
    "%s altera a forma direto, sem passar pelo aviso",
    async (role) => {
      auth.user = { role };
      changePaymentMethod.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      render(<DeliveryDashboardPage />);

      await user.click(screen.getByRole("button", { name: "Alterar forma de pagamento" }));
      const dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: /Crédito/ }));
      await user.click(within(dialog).getByRole("button", { name: "Salvar forma" }));

      expect(changePaymentMethod).toHaveBeenCalledWith({
        deliveryId: "del-1",
        paymentId: "pay-1",
        update: {
          orderId: "order-aaaaaaaa",
          customerId: "cus-1",
          amount: 35.9,
          paymentMethod: "CREDIT_CARD",
          status: "PENDING",
        },
      });
      expect(requestPaymentChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );

  it("o entregador não vê botão enquanto o aviso ao gerente está desligado", () => {
    auth.user = { role: "delivery" };
    render(<DeliveryDashboardPage />);

    expect(screen.queryByRole("button", { name: /forma de pagamento/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Avisar o gerente/ })).toBeNull();
  });

  it("com o aviso ligado, o entregador avisa o gerente e não altera nada", async () => {
    auth.user = { role: "delivery" };
    flags.requestEnabled = true;
    requestPaymentChange.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<DeliveryDashboardPage />);

    await user.click(screen.getByRole("button", { name: /Avisar o gerente/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /PIX/ }));
    await user.type(within(dialog).getByLabelText("Observação (opcional)"), "pagou no pix");
    await user.click(within(dialog).getByRole("button", { name: "Enviar aviso" }));

    expect(requestPaymentChange).toHaveBeenCalledWith({
      deliveryId: "del-1",
      orderId: "order-aaaaaaaa",
      paymentId: "pay-1",
      paymentMethod: "PIX",
      note: "pagou no pix",
    });
    expect(changePaymentMethod).not.toHaveBeenCalled();
  });

  it("mantém a janela aberta quando o backend recusa", async () => {
    changePaymentMethod.mockResolvedValue({ success: false, message: "Sem permissão" });
    const user = userEvent.setup();
    render(<DeliveryDashboardPage />);

    await user.click(screen.getByRole("button", { name: "Alterar forma de pagamento" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Dinheiro/ }));
    await user.click(within(dialog).getByRole("button", { name: "Salvar forma" }));

    expect(changePaymentMethod).toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

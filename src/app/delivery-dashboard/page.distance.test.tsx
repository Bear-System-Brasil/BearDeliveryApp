import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Delivery } from "@/services/api";
import DeliveryDashboardPage from "./page";

// Entregador no centro de Castelo/ES.
const CASTELO = { lat: -20.6036, lng: -41.1847 };

const pending = (latitude: unknown, longitude: unknown) =>
  ({
    id: "n1",
    orderId: "order-aaaaaaaa",
    status: "PENDING",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deliveryAddress: { latitude, longitude },
  }) as unknown as Delivery;

// Referências estáveis: identidade nova a cada render causa laço infinito.
const { driver, confirmation, position, locationDialog } = vi.hoisted(() => ({
  driver: { current: {} as Record<string, unknown> },
  confirmation: { shouldConfirm: false, setSkipConfirm: () => {} },
  position: { position: null, resolvePosition: vi.fn() },
  locationDialog: { open: false, purpose: "" },
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
vi.mock("@/components/delivery-dashboard/delivery-card", () => ({
  DeliveryCard: ({
    delivery,
    onAccept,
  }: {
    delivery: Delivery;
    onAccept?: (id: string) => void;
  }) => (
    <button type="button" onClick={() => onAccept?.(delivery.id)}>
      aceitar {delivery.id}
    </button>
  ),
}));
vi.mock("@/components/delivery-dashboard/accept-confirm-dialog", () => ({
  AcceptConfirmDialog: () => null,
}));
vi.mock("@/components/delivery-dashboard/return-dialog", () => ({
  ReturnDialog: () => null,
}));
vi.mock("@/components/delivery-dashboard/location-dialog", () => ({
  LocationDialog: ({ open, purpose }: { open: boolean; purpose: string }) => {
    locationDialog.open = open;
    locationDialog.purpose = purpose;
    return null;
  },
}));

const acceptDelivery = vi.fn();

function setAvailable(delivery: Delivery) {
  driver.current = {
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    inRouteDeliveries: [],
    toPickUpDeliveries: [],
    availableDeliveries: [delivery],
    soundEnabled: true,
    toggleSound: vi.fn(),
    acceptDelivery,
    acceptingId: null,
    advanceDelivery: vi.fn(),
    advancingId: null,
    returnDelivery: vi.fn(),
    returningId: null,
    isReturning: false,
    hasMorePages: false,
    counts: { mine: 0, inRoute: 0, toPickUp: 0, recent: 0, available: 1 },
  };
}

async function accept() {
  render(<DeliveryDashboardPage />);
  await act(async () => {
    fireEvent.click(screen.getByText("aceitar n1"));
  });
}

beforeEach(() => {
  acceptDelivery.mockReset();
  locationDialog.open = false;
  position.resolvePosition.mockResolvedValue({
    ok: true,
    position: { coords: CASTELO, source: "gps", at: Date.now() },
  });
});

describe("DeliveryDashboardPage - distância até o cliente no aceite", () => {
  it("cliente perto: aceita com a posição", async () => {
    setAvailable(pending("-20.6146", "-41.2077"));
    await accept();

    expect(acceptDelivery).toHaveBeenCalledWith(
      { id: "n1", coords: CASTELO },
      expect.anything(),
    );
  });

  it("cliente longe demais: não aceita e oferece corrigir a localização", async () => {
    // Vitória/ES, ~100 km em linha reta
    setAvailable(pending("-20.3155", "-40.3128"));
    await accept();

    expect(acceptDelivery).not.toHaveBeenCalled();
    expect(
      screen.getByText("Você está longe demais desta entrega"),
    ).toBeInTheDocument();
    expect(screen.getByText(/precisa estar a até 25 km/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Corrigir localização" }));

    expect(locationDialog).toEqual({ open: true, purpose: "accept" });
  });

  it("cliente sem coordenada: não aceita e oferece o e-mail do suporte", async () => {
    setAvailable(pending(null, null));
    await accept();

    expect(acceptDelivery).not.toHaveBeenCalled();
    const email = screen.getByRole("link", { name: "Enviar e-mail" });
    const href = email.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:beardeliveryofc@gmail.com?")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Entrega: n1");
  });
});

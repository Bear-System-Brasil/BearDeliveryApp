import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Delivery } from "@/services/api";
import DeliveryDashboardPage from "./page";

const delivery = (id: string, status: Delivery["status"]) =>
  ({
    id,
    orderId: `order-${id}`,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }) as Delivery;

// Referências estáveis: identidade nova a cada render causa laço infinito.
const { driver, confirmation, position } = vi.hoisted(() => ({
  driver: { current: {} as Record<string, unknown> },
  confirmation: { shouldConfirm: false, setSkipConfirm: () => {} },
  position: { position: null, resolvePosition: async () => ({ ok: false }) },
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

// O card e os diálogos não interessam aqui - só o que cada filtro mostra.
vi.mock("@/components/delivery-dashboard/delivery-card", () => ({
  DeliveryCard: ({ delivery }: { delivery: Delivery }) => (
    <div data-testid="card">{delivery.id}</div>
  ),
}));
vi.mock("@/components/delivery-dashboard/accept-confirm-dialog", () => ({
  AcceptConfirmDialog: () => null,
}));
vi.mock("@/components/delivery-dashboard/cancel-dialog", () => ({
  CancelDialog: () => null,
}));
vi.mock("@/components/delivery-dashboard/location-dialog", () => ({
  LocationDialog: () => null,
}));

function setDriver(groups: {
  inRoute?: Delivery[];
  toPickUp?: Delivery[];
  recent?: Delivery[];
  available?: Delivery[];
}) {
  const inRoute = groups.inRoute ?? [];
  const toPickUp = groups.toPickUp ?? [];
  const recent = groups.recent ?? [];
  const available = groups.available ?? [];

  driver.current = {
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    myDeliveries: [...inRoute, ...toPickUp],
    inRouteDeliveries: inRoute,
    toPickUpDeliveries: toPickUp,
    recentlyDelivered: recent,
    availableDeliveries: available,
    soundEnabled: true,
    toggleSound: vi.fn(),
    acceptDelivery: vi.fn(),
    acceptingId: null,
    advanceDelivery: vi.fn(),
    advancingId: null,
    cancelDelivery: vi.fn(),
    cancelingId: null,
    isCanceling: false,
    hasMorePages: false,
    counts: {
      mine: inRoute.length + toPickUp.length,
      inRoute: inRoute.length,
      toPickUp: toPickUp.length,
      recent: recent.length,
      available: available.length,
    },
  };
}

const cardIds = () =>
  screen.queryAllByTestId("card").map((card) => card.textContent);

describe("DeliveryDashboardPage - filtros", () => {
  beforeEach(() => {
    setDriver({
      inRoute: [delivery("p1", "PICKED_UP")],
      toPickUp: [delivery("a1", "ACCEPTED")],
      recent: [delivery("d1", "DELIVERED")],
      available: [delivery("n1", "PENDING")],
    });
  });

  it("em Todos, mostra em rota antes de a coletar, e as disponíveis", () => {
    render(<DeliveryDashboardPage />);

    expect(screen.getByRole("heading", { name: "Em rota" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A coletar" })).toBeInTheDocument();
    expect(cardIds()).toEqual(["p1", "a1", "n1"]);
  });

  it("entregas fechadas não aparecem no painel - ficam só no histórico", () => {
    render(<DeliveryDashboardPage />);

    expect(screen.queryByRole("button", { name: /^Entregues/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Entregues" })).toBeNull();
    expect(cardIds()).not.toContain("d1");
  });

  it.each([
    ["Em rota", ["p1"]],
    ["A coletar", ["a1"]],
    ["Disponíveis", ["n1"]],
  ])("filtro %s mostra só o seu grupo", (label, expected) => {
    render(<DeliveryDashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));

    expect(cardIds()).toEqual(expected);
    expect(
      screen.getByRole("button", { name: new RegExp(`^${label}`) }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("filtro específico vazio mostra o grupo com aviso", () => {
    setDriver({ toPickUp: [delivery("a1", "ACCEPTED")] });
    render(<DeliveryDashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: /^Em rota/ }));

    expect(screen.getByText("Nenhuma entrega em rota.")).toBeInTheDocument();
    expect(cardIds()).toEqual([]);
  });

  it("em Todos sem nada em andamento, um aviso só no lugar dos dois grupos", () => {
    setDriver({ available: [delivery("n1", "PENDING")] });
    render(<DeliveryDashboardPage />);

    expect(
      screen.getByText("Você não tem nenhuma entrega em andamento."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Em rota" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "A coletar" })).toBeNull();
  });
});

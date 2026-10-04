import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Delivery } from "@/services/api";
import { DeliveryCard } from "./delivery-card";

const delivery = (status: Delivery["status"], phone?: string) =>
  ({
    id: "d1",
    orderId: "order-1",
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order: {
      customer: { id: "c1", name: "Cliente", phone },
    },
  }) as unknown as Delivery;

const callLink = () => screen.queryByRole("link", { name: /Ligar/ });

describe("DeliveryCard - botão Ligar", () => {
  it("não mostra o telefone em entrega disponível, antes do aceite", () => {
    render(<DeliveryCard delivery={delivery("PENDING", "27999998888")} />);

    expect(callLink()).toBeNull();
  });

  it.each(["ACCEPTED", "PICKED_UP"] as const)(
    "mostra o Ligar com o número em %s",
    (status) => {
      render(<DeliveryCard delivery={delivery(status, "(27) 99999-8888")} />);

      expect(callLink()).toHaveAttribute("href", "tel:27999998888");
    },
  );

  it("sem telefone no payload, não mostra o botão mesmo depois do aceite", () => {
    render(<DeliveryCard delivery={delivery("ACCEPTED")} />);

    expect(callLink()).toBeNull();
  });
});

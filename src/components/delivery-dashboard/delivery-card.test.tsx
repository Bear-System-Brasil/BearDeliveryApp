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
    deliveryAddress: {
      street: "Rua das Flores",
      number: "10",
      neighborhood: "Centro",
      city: "Castelo",
      state: "ES",
      reference: "Portão azul",
    },
    order: {
      customer: { id: "c1", name: "Maria Souza", phone },
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

describe("DeliveryCard - dados do cliente antes do aceite", () => {
  it("disponível mostra só bairro e cidade, sem nome, rua, referência nem Maps", () => {
    render(<DeliveryCard delivery={delivery("PENDING", "27999998888")} />);

    expect(screen.getByText("Centro · Castelo · ES")).toBeInTheDocument();
    expect(screen.queryByText(/Rua das Flores/)).toBeNull();
    expect(screen.queryByText(/Portão azul/)).toBeNull();
    expect(screen.queryByText("Maria Souza")).toBeNull();
    expect(screen.queryByRole("link", { name: /Maps/ })).toBeNull();
  });

  it("depois do aceite mostra endereço completo, nome e Maps", () => {
    render(<DeliveryCard delivery={delivery("ACCEPTED", "27999998888")} />);

    expect(screen.getByText("Rua das Flores, 10")).toBeInTheDocument();
    expect(screen.getByText(/Portão azul/)).toBeInTheDocument();
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Maps/ })).toBeInTheDocument();
  });
});

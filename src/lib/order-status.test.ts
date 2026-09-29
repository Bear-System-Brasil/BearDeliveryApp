import { describe, expect, it } from "vitest";
import {
  getOrderStatus,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  getOrderStep,
  getOrderTrackingStatus,
  isActiveOrder,
  isCanceledOrder,
  isInertOrder,
} from "./order-status";

describe("getOrderStatus", () => {
  it("normaliza o status em maiúsculas", () => {
    expect(getOrderStatus({ status: "ordered" })).toBe("ORDERED");
  });

  it("trata status ausente como string vazia", () => {
    expect(getOrderStatus({})).toBe("");
    expect(getOrderStatus({ status: null })).toBe("");
  });
});

describe("isCanceledOrder / isActiveOrder / isInertOrder", () => {
  it("identifica pedido cancelado", () => {
    expect(isCanceledOrder({ status: "CANCELED" })).toBe(true);
    expect(isCanceledOrder({ status: "ORDERED" })).toBe(false);
  });

  it("identifica pedidos ativos na cozinha", () => {
    expect(isActiveOrder({ status: "ORDERED" })).toBe(true);
    expect(isActiveOrder({ status: "IN_PRODUCTION" })).toBe(true);
    expect(isActiveOrder({ status: "READY_FOR_PICKUP" })).toBe(true);
    expect(isActiveOrder({ status: "COMPLETED" })).toBe(false);
    expect(isActiveOrder({ status: "CART" })).toBe(false);
  });

  it("identifica carrinho/abandonado como inertes", () => {
    expect(isInertOrder({ status: "CART" })).toBe(true);
    expect(isInertOrder({ status: "ABANDONED" })).toBe(true);
    expect(isInertOrder({ status: "ORDERED" })).toBe(false);
  });
});

describe("getOrderStep", () => {
  it("mapeia cada status para o passo correspondente", () => {
    expect(getOrderStep({ status: "ORDERED" })).toBe(0);
    expect(getOrderStep({ status: "IN_PRODUCTION" })).toBe(1);
    expect(getOrderStep({ status: "READY_FOR_PICKUP" })).toBe(2);
    expect(getOrderStep({ status: "COMPLETED" })).toBe(3);
  });

  it("status desconhecido cai no passo 0 em vez de quebrar", () => {
    expect(getOrderStep({ status: "ALGO_NOVO" })).toBe(0);
  });

  it("antecipa para o passo final quando a entrega já foi concluída", () => {
    expect(
      getOrderStep({ status: "READY_FOR_PICKUP", delivery: { status: "DELIVERED" } }),
    ).toBe(3);
  });

  it("não antecipa o passo quando a entrega só foi retirada (ainda a caminho)", () => {
    expect(
      getOrderStep({ status: "READY_FOR_PICKUP", delivery: { status: "PICKED_UP" } }),
    ).toBe(2);
  });
});

describe("getOrderStatusLabel", () => {
  it("usa o rótulo padrão por status", () => {
    expect(getOrderStatusLabel({ status: "IN_PRODUCTION" })).toBe("Em preparo");
    expect(getOrderStatusLabel({ status: "CANCELED" })).toBe("Cancelado");
  });

  it("refina READY_FOR_PICKUP com o status da entrega", () => {
    expect(
      getOrderStatusLabel({ status: "READY_FOR_PICKUP", delivery: { status: "PICKED_UP" } }),
    ).toBe("A caminho");
    expect(
      getOrderStatusLabel({ status: "READY_FOR_PICKUP", delivery: { status: "DELIVERED" } }),
    ).toBe("Entregue");
  });

  it("READY_FOR_PICKUP sem entrega em trânsito mantém 'Pronto'", () => {
    expect(getOrderStatusLabel({ status: "READY_FOR_PICKUP" })).toBe("Pronto");
  });

  it("cai no fallback genérico para status desconhecido", () => {
    expect(getOrderStatusLabel({ status: "ALGO_NOVO" })).toBe("Em andamento");
  });
});

describe("getOrderStatusBadgeClass", () => {
  it("usa vermelho para cancelado", () => {
    expect(getOrderStatusBadgeClass({ status: "CANCELED" })).toContain("red");
  });

  it("usa cinza para carrinho/abandonado", () => {
    expect(getOrderStatusBadgeClass({ status: "CART" })).toContain("gray");
  });

  it("usa a cor da marca para pedidos ativos", () => {
    // Era "orange" até o rebrand trocar a paleta por tokens - o teste ficou
    // preso na cor antiga e quebrou sozinho, sem nada de errado no código.
    expect(getOrderStatusBadgeClass({ status: "IN_PRODUCTION" })).toContain("brand");
  });

  it("usa verde para os demais (ex.: concluído)", () => {
    expect(getOrderStatusBadgeClass({ status: "COMPLETED" })).toContain("green");
  });
});

describe("getOrderTrackingStatus", () => {
  it("prioriza a entrega concluída independente do status do pedido", () => {
    expect(
      getOrderTrackingStatus({ status: "IN_PRODUCTION", delivery: { status: "DELIVERED" } }),
    ).toBe("delivered");
  });

  it("mapeia COMPLETED para delivered", () => {
    expect(getOrderTrackingStatus({ status: "COMPLETED" })).toBe("delivered");
  });

  it("READY_FOR_PICKUP com entrega em trânsito vira delivering, senão ready", () => {
    expect(
      getOrderTrackingStatus({ status: "READY_FOR_PICKUP", delivery: { status: "PICKED_UP" } }),
    ).toBe("delivering");
    expect(getOrderTrackingStatus({ status: "READY_FOR_PICKUP" })).toBe("ready");
  });

  it("mapeia IN_PRODUCTION para preparing e o resto para confirmed", () => {
    expect(getOrderTrackingStatus({ status: "IN_PRODUCTION" })).toBe("preparing");
    expect(getOrderTrackingStatus({ status: "ORDERED" })).toBe("confirmed");
    expect(getOrderTrackingStatus({ status: "AWAITING_PAYMENT" })).toBe("confirmed");
  });
});

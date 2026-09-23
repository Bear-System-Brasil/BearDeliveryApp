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
  it("normaliza o status para caixa alta", () => {
    expect(getOrderStatus({ status: "ordered" })).toBe("ORDERED");
  });

  it("devolve string vazia quando não há status", () => {
    expect(getOrderStatus({})).toBe("");
    expect(getOrderStatus({ status: null })).toBe("");
  });
});

describe("isCanceledOrder / isActiveOrder / isInertOrder", () => {
  it("isCanceledOrder só é true para CANCELED", () => {
    expect(isCanceledOrder({ status: "CANCELED" })).toBe(true);
    expect(isCanceledOrder({ status: "COMPLETED" })).toBe(false);
  });

  it("isActiveOrder cobre os status em produção na cozinha", () => {
    for (const status of ["AWAITING_PAYMENT", "ORDERED", "IN_PRODUCTION", "READY_FOR_PICKUP"]) {
      expect(isActiveOrder({ status })).toBe(true);
    }
    expect(isActiveOrder({ status: "COMPLETED" })).toBe(false);
    expect(isActiveOrder({ status: "CART" })).toBe(false);
  });

  it("isInertOrder cobre carrinho e abandonado, não pedidos reais", () => {
    expect(isInertOrder({ status: "CART" })).toBe(true);
    expect(isInertOrder({ status: "ABANDONED" })).toBe(true);
    expect(isInertOrder({ status: "ORDERED" })).toBe(false);
  });
});

describe("getOrderStep", () => {
  it("mapeia cada status para o passo esperado da timeline", () => {
    expect(getOrderStep({ status: "AWAITING_PAYMENT" })).toBe(0);
    expect(getOrderStep({ status: "ORDERED" })).toBe(0);
    expect(getOrderStep({ status: "IN_PRODUCTION" })).toBe(1);
    expect(getOrderStep({ status: "READY_FOR_PICKUP" })).toBe(2);
    expect(getOrderStep({ status: "COMPLETED" })).toBe(3);
    expect(getOrderStep({ status: "CANCELED" })).toBe(3);
  });

  it("status desconhecido (carrinho, abandonado, etc.) cai no passo 0", () => {
    expect(getOrderStep({ status: "CART" })).toBe(0);
    expect(getOrderStep({})).toBe(0);
  });

  it("antecipa para o passo 3 quando a entrega já foi concluída, mesmo com o pedido ainda READY_FOR_PICKUP", () => {
    expect(
      getOrderStep({ status: "READY_FOR_PICKUP", delivery: { status: "DELIVERED" } }),
    ).toBe(3);
    expect(
      getOrderStep({ status: "READY_FOR_PICKUP", delivery: { status: "RECEIVED" } }),
    ).toBe(3);
  });

  it("não antecipa o passo quando a entrega ainda está em trânsito", () => {
    expect(
      getOrderStep({ status: "READY_FOR_PICKUP", delivery: { status: "PICKED_UP" } }),
    ).toBe(2);
  });

  it("entrega concluída não afeta status que não seja READY_FOR_PICKUP (ex: IN_PRODUCTION)", () => {
    expect(
      getOrderStep({ status: "IN_PRODUCTION", delivery: { status: "DELIVERED" } }),
    ).toBe(1);
  });
});

describe("getOrderStatusLabel", () => {
  it("traduz cada status para o rótulo em português", () => {
    expect(getOrderStatusLabel({ status: "ORDERED" })).toBe("Confirmado");
    expect(getOrderStatusLabel({ status: "IN_PRODUCTION" })).toBe("Em preparo");
    expect(getOrderStatusLabel({ status: "COMPLETED" })).toBe("Entregue");
    expect(getOrderStatusLabel({ status: "CANCELED" })).toBe("Cancelado");
  });

  it("READY_FOR_PICKUP mostra 'A caminho' quando o entregador já retirou", () => {
    expect(
      getOrderStatusLabel({ status: "READY_FOR_PICKUP", delivery: { status: "PICKED_UP" } }),
    ).toBe("A caminho");
  });

  it("READY_FOR_PICKUP mostra 'Entregue' quando a entrega já foi concluída", () => {
    expect(
      getOrderStatusLabel({ status: "READY_FOR_PICKUP", delivery: { status: "DELIVERED" } }),
    ).toBe("Entregue");
  });

  it("READY_FOR_PICKUP sem entrega ainda mostra 'Pronto'", () => {
    expect(getOrderStatusLabel({ status: "READY_FOR_PICKUP" })).toBe("Pronto");
  });

  it("cai para 'Em andamento' com status desconhecido/ausente", () => {
    expect(getOrderStatusLabel({ status: "ALGO_NOVO_DO_BACKEND" })).toBe("Em andamento");
    expect(getOrderStatusLabel({})).toBe("Em andamento");
  });
});

describe("getOrderStatusBadgeClass", () => {
  it("usa vermelho para cancelado", () => {
    expect(getOrderStatusBadgeClass({ status: "CANCELED" })).toContain("red");
  });

  it("usa cinza para carrinho/abandonado", () => {
    expect(getOrderStatusBadgeClass({ status: "CART" })).toContain("gray");
  });

  it("usa laranja para pedido ativo na cozinha", () => {
    expect(getOrderStatusBadgeClass({ status: "IN_PRODUCTION" })).toContain("orange");
  });

  it("usa verde como fallback (ex.: concluído)", () => {
    expect(getOrderStatusBadgeClass({ status: "COMPLETED" })).toContain("green");
  });

  it("cancelado tem prioridade sobre qualquer status de entrega", () => {
    expect(
      getOrderStatusBadgeClass({ status: "CANCELED", delivery: { status: "DELIVERED" } }),
    ).toContain("red");
  });
});

describe("getOrderTrackingStatus", () => {
  it("mapeia os status intermediários do pedido", () => {
    expect(getOrderTrackingStatus({ status: "ORDERED" })).toBe("confirmed");
    expect(getOrderTrackingStatus({ status: "AWAITING_PAYMENT" })).toBe("confirmed");
    expect(getOrderTrackingStatus({ status: "IN_PRODUCTION" })).toBe("preparing");
    expect(getOrderTrackingStatus({ status: "COMPLETED" })).toBe("delivered");
  });

  it("READY_FOR_PICKUP sem entrega em trânsito é 'ready'", () => {
    expect(getOrderTrackingStatus({ status: "READY_FOR_PICKUP" })).toBe("ready");
  });

  it("READY_FOR_PICKUP com entrega em trânsito (PICKED_UP) é 'delivering'", () => {
    expect(
      getOrderTrackingStatus({ status: "READY_FOR_PICKUP", delivery: { status: "PICKED_UP" } }),
    ).toBe("delivering");
  });

  it("entrega concluída sempre vence e marca 'delivered', mesmo se o pedido ainda não fechou", () => {
    expect(
      getOrderTrackingStatus({ status: "IN_PRODUCTION", delivery: { status: "DELIVERED" } }),
    ).toBe("delivered");
    expect(
      getOrderTrackingStatus({ status: "READY_FOR_PICKUP", delivery: { status: "RECEIVED" } }),
    ).toBe("delivered");
  });

  it("status desconhecido sem entrega cai em 'confirmed' (regressão do mapa antigo)", () => {
    // Bug histórico: o mapa antigo não conhecia os enums reais do backend e
    // travava sempre em "confirmed" para tudo que não fosse literal match.
    // Aqui o fallback também é "confirmed", mas IN_PRODUCTION/READY_FOR_PICKUP
    // (testados acima) já saem do fallback e vão para preparing/ready.
    expect(getOrderTrackingStatus({ status: "ALGO_DESCONHECIDO" })).toBe("confirmed");
  });
});

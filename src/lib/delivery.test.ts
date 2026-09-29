import { describe, expect, it } from "vitest";

import { getPaymentSummary, isSameMoney } from "@/lib/delivery";
import {
  PaymentMethod,
  PaymentStatus,
  type Delivery,
  type Payment,
} from "@/services/api";

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    amount: 35.9,
    orderId: "order-1",
    customerId: "cus-1",
    paymentMethod: PaymentMethod.CASH,
    status: PaymentStatus.PENDING,
    ...overrides,
  };
}

/** Só o que `getPaymentSummary` lê - o resto do Delivery não importa aqui. */
function makeDelivery(payments: Payment[], totalValue = 35.9): Delivery {
  return {
    order: { totalValue, payments },
  } as unknown as Delivery;
}

describe("getPaymentSummary", () => {
  it("sem pagamento utilizável devolve null, em vez de afirmar 'pago'", () => {
    expect(getPaymentSummary(makeDelivery([]))).toBeNull();
    expect(
      getPaymentSummary(
        makeDelivery([makePayment({ status: PaymentStatus.CANCELLED })]),
      ),
    ).toBeNull();
  });

  it("sem troco, o valor a receber é o total e não há troco a levar", () => {
    const summary = getPaymentSummary(makeDelivery([makePayment()]));

    expect(summary).toMatchObject({
      isPaid: false,
      amountDue: 35.9,
      paysWith: null,
      changeDue: null,
      methods: ["Dinheiro"],
    });
  });

  it("changeFor é o que o cliente entrega, não o troco", () => {
    // Pedido de R$ 35,90 pago com R$ 50 dá R$ 14,10 de troco - e não R$ 50.
    const summary = getPaymentSummary(
      makeDelivery([makePayment({ changeFor: 50 })]),
    );

    expect(summary?.amountDue).toBe(35.9);
    expect(summary?.paysWith).toBe(50);
    expect(summary?.changeDue).toBe(14.1);
  });

  it("arredonda o troco em centavos", () => {
    // 50 - 35.90 em ponto flutuante dá 14.100000000000001.
    const summary = getPaymentSummary(
      makeDelivery([makePayment({ changeFor: 50 })]),
    );

    expect(Number.isInteger((summary?.changeDue ?? 0) * 100)).toBe(true);
  });

  it("pagar o valor exato não é troco", () => {
    const summary = getPaymentSummary(
      makeDelivery([makePayment({ changeFor: 35.9 })]),
    );

    expect(summary?.changeDue).toBeNull();
    expect(summary?.paysWith).toBeNull();
  });

  it("changeFor menor que a conta é dado incoerente - não vira troco negativo", () => {
    const summary = getPaymentSummary(
      makeDelivery([makePayment({ changeFor: 20 })]),
    );

    expect(summary?.changeDue).toBeNull();
    expect(summary?.amountDue).toBe(35.9);
  });

  it("pagamento concluído não é valor a receber", () => {
    const summary = getPaymentSummary(
      makeDelivery([makePayment({ status: PaymentStatus.COMPLETED })]),
    );

    expect(summary).toMatchObject({ isPaid: true, amountDue: 0 });
  });

  it("descarta falho e estornado ao somar o que falta receber", () => {
    const summary = getPaymentSummary(
      makeDelivery([
        makePayment({ id: "a", amount: 10 }),
        makePayment({ id: "b", amount: 99, status: PaymentStatus.FAILED }),
        makePayment({ id: "c", amount: 99, status: PaymentStatus.REFUNDED }),
      ]),
    );

    expect(summary?.amountDue).toBe(10);
  });

  it("soma pagamentos pendentes quando o pedido foi dividido", () => {
    const summary = getPaymentSummary(
      makeDelivery([
        makePayment({ id: "a", amount: 20 }),
        makePayment({
          id: "b",
          amount: 15.9,
          paymentMethod: PaymentMethod.PIX,
        }),
      ]),
    );

    expect(summary?.amountDue).toBe(35.9);
    expect(summary?.methods).toEqual(["Dinheiro", "PIX"]);
  });
});

describe("isSameMoney", () => {
  it("compara até o centavo", () => {
    expect(isSameMoney(35.9, 35.9)).toBe(true);
    expect(isSameMoney(0.1 + 0.2, 0.3)).toBe(true);
    expect(isSameMoney(35.9, 35.91)).toBe(false);
  });
});

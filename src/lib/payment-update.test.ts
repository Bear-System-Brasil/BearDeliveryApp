import { describe, expect, it } from "vitest";

import { buildPaymentMethodUpdate } from "@/lib/payment-update";
import { PaymentMethod, PaymentStatus } from "@/services/api";

const PAYMENT = {
  orderId: "order-1",
  customerId: "cus-1",
  amount: 35.9,
  status: PaymentStatus.PENDING,
};

describe("buildPaymentMethodUpdate", () => {
  it("manda o corpo inteiro com os valores atuais e só troca a forma", () => {
    expect(buildPaymentMethodUpdate(PAYMENT, PaymentMethod.CREDIT_CARD)).toEqual({
      orderId: "order-1",
      customerId: "cus-1",
      amount: 35.9,
      paymentMethod: "CREDIT_CARD",
      status: "PENDING",
    });
  });

  it("converte o valor que chega como texto", () => {
    const update = buildPaymentMethodUpdate(
      { ...PAYMENT, amount: "35.90" as unknown as number },
      PaymentMethod.PIX,
    );

    expect(update.amount).toBe(35.9);
  });

  it("deixa de fora o campo que não veio, em vez de mandar vazio", () => {
    const update = buildPaymentMethodUpdate(
      { orderId: "order-1", customerId: "", amount: Number.NaN, status: PaymentStatus.PENDING },
      PaymentMethod.CASH,
    );

    expect(update).toEqual({
      orderId: "order-1",
      paymentMethod: "CASH",
      status: "PENDING",
    });
  });
});

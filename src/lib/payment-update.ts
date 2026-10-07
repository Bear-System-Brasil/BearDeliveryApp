import type {
  Payment,
  PaymentMethod,
  UpdatePaymentRequest,
} from "@/services/api";

/**
 * Corpo do PATCH /payment/:id para trocar só a forma de pagamento.
 *
 * O backend valida o corpo inteiro: só com `paymentMethod` respondeu
 * "Valor inválido", e com o `amount` junto respondeu "Id inválido" (preview,
 * 05-06/10). Por isso vão todos os campos do exemplo de payment.md com o
 * valor atual do pagamento, e só a forma muda. Campo que não veio no
 * pagamento fica de fora, em vez de ir vazio.
 */
export function buildPaymentMethodUpdate(
  payment: Pick<Payment, "orderId" | "customerId" | "amount" | "status">,
  paymentMethod: PaymentMethod,
): UpdatePaymentRequest {
  const update: UpdatePaymentRequest = { paymentMethod };

  if (payment.orderId) update.orderId = payment.orderId;
  if (payment.customerId) update.customerId = payment.customerId;

  // O valor pode chegar como texto da API.
  const amount = Number(payment.amount);
  if (Number.isFinite(amount) && amount > 0) update.amount = amount;

  if (payment.status) update.status = payment.status;

  return update;
}

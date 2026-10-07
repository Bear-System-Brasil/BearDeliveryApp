import type { ApiResponse, PaymentMethod } from "@/services/api";

/**
 * Pedidos do entregador à gerência (LDMF-284).
 *
 * O entregador não pode alterar a forma de pagamento: só avisa a gerência,
 * que decide. A rota ainda não existe no backend, e o contrato não foi
 * definido - por isso nada aqui chama a API. A tela já está pronta; quando o
 * LDMF-284 documentar a rota, a chamada entra em `requestPaymentMethodChange`
 * e a flag abaixo vira `true`.
 */
export const PAYMENT_CHANGE_REQUEST_ENABLED = false;

export interface PaymentChangeRequest {
  deliveryId: string;
  orderId: string;
  paymentId: string;
  /** Forma que o cliente usou de fato. */
  paymentMethod: PaymentMethod;
  note?: string;
}

export async function requestPaymentMethodChange(
  _request: PaymentChangeRequest,
): Promise<ApiResponse<unknown>> {
  return {
    success: false,
    message: "O aviso ao gerente ainda não está disponível.",
  };
}

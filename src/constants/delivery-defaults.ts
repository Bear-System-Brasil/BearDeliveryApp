/**
 * Frete e tempo de entrega exibidos enquanto a listagem de lojas não manda
 * `deliveryFee` e `time` (TODO(backend)). São valores de vitrine, de
 * propósito fora da realidade (R$ 99 / 0-100 min), pra ninguém confundir com
 * dado real - somem sozinhos quando a API passar a enviar os campos.
 */
export const DEFAULT_DELIVERY_FEE = "99";
export const DEFAULT_DELIVERY_TIME = "0-100 min";

type DeliveryFields = {
  deliveryFee?: string | number | null;
  time?: string | null;
};

const isBlank = (value: unknown) =>
  value === undefined || value === null || value === "";

/** Preenche frete e tempo só quando a API não mandou. */
export function withDeliveryDefaults<T extends DeliveryFields>(store: T): T {
  return {
    ...store,
    deliveryFee: isBlank(store.deliveryFee)
      ? DEFAULT_DELIVERY_FEE
      : store.deliveryFee,
    time: isBlank(store.time) ? DEFAULT_DELIVERY_TIME : store.time,
  };
}

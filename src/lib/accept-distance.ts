import { parseCoords } from "@/lib/geocode";
import type { Delivery } from "@/services/api";
import type { Coords } from "@/types/restaurant";

/**
 * Distância máxima, em linha reta, entre o entregador e o cliente pra
 * aceitar uma entrega (LDMF-321).
 *
 * O backend calcula o frete com a posição enviada no aceite e não recusa
 * nenhuma distância: uma posição errada virou frete de R$ 3.698 no
 * LDMF-314. Por enquanto a trava fica aqui; a regra vai pro backend num
 * card à parte. Linha reta é sempre menor que o caminho pela rua.
 */
export const MAX_ACCEPT_DISTANCE_KM = 25;

/** E-mail de suporte oferecido quando o aceite é bloqueado por dado faltando. */
export const SUPPORT_EMAIL = "beardeliveryofc@gmail.com";

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Distância em linha reta (haversine), em km. */
export function straightLineKm(from: Coords, to: Coords): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export type AcceptDistanceCheck =
  | { ok: true; km: number }
  | { ok: false; reason: "too-far"; km: number }
  | { ok: false; reason: "no-customer-coords" };

/**
 * Pode aceitar desta posição?
 *
 * O endereço do cliente chega com latitude/longitude em string (apesar do
 * tipo dizer number) - `parseCoords` cobre string, null e 0,0. Sem
 * coordenada não há como conferir, e o aceite é bloqueado: não deveria
 * acontecer, e deixar passar é justamente o frete sem controle.
 */
export function checkAcceptDistance(
  delivery: Delivery,
  courier: Coords,
): AcceptDistanceCheck {
  const customer = parseCoords(
    delivery.deliveryAddress?.latitude,
    delivery.deliveryAddress?.longitude,
  );
  if (!customer) return { ok: false, reason: "no-customer-coords" };

  const km = straightLineKm(courier, customer);
  if (km > MAX_ACCEPT_DISTANCE_KM) return { ok: false, reason: "too-far", km };

  return { ok: true, km };
}

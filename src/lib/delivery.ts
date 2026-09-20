import type { Address, Delivery } from "@/services/api";
import { onlyNumbers } from "@/utils";

export type DeliveryStatus = Delivery["status"];

/**
 * Janela do grupo "Entregues" na tela do entregador. Mais antigo que isso sai
 * da tela operacional e só aparece no histórico.
 */
export const RECENT_DELIVERY_WINDOW_MS = 60 * 60 * 1000;

const ACTIVE_STATUSES = new Set<DeliveryStatus>(["ACCEPTED", "PICKED_UP"]);
const FINISHED_STATUSES = new Set<DeliveryStatus>([
  "DELIVERED",
  "RECEIVED",
  "COMPLETED",
]);

/** Aceita pelo entregador e ainda não fechada. */
export const isActiveForDriver = (delivery: Delivery) =>
  ACTIVE_STATUSES.has(delivery.status);

/** Fechada com sucesso - DELIVERED e os estados que vêm depois dele. */
export const isFinished = (delivery: Delivery) =>
  FINISHED_STATUSES.has(delivery.status);

export const isCanceled = (delivery: Delivery) =>
  delivery.status === "CANCELED";

export const isAvailable = (delivery: Delivery) =>
  delivery.status === "PENDING";

/**
 * Cancelar vale só antes da coleta. O limite documentado é PICKED_UP e é
 * exclusivo: depois de pegar a comida no restaurante não dá mais pra
 * cancelar - a partir daí o caminho é entregar.
 */
export const canCancel = (delivery: Delivery) => delivery.status === "ACCEPTED";

/**
 * Próximo status do fluxo, ou null quando não há avanço possível pelo
 * entregador. É o que decide a ação primária do card.
 */
export function getNextStatus(delivery: Delivery): DeliveryStatus | null {
  if (delivery.status === "ACCEPTED") return "PICKED_UP";
  if (delivery.status === "PICKED_UP") return "DELIVERED";
  return null;
}

/** Timestamp utilizável, ou null quando a data não veio ou veio inválida. */
function toTime(value?: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

/** Quando a entrega foi fechada. `deliveryTime` é o campo certo; cai pro
 * `updated_at` quando o backend não preenche. */
export function getFinishedAt(delivery: Delivery): number | null {
  return toTime(delivery.deliveryTime) ?? toTime(delivery.updated_at);
}

function getCreatedAt(delivery: Delivery): number {
  return toTime(delivery.created_at) ?? 0;
}

export function isRecentlyFinished(delivery: Delivery, now: number) {
  if (!isFinished(delivery)) return false;
  const finishedAt = getFinishedAt(delivery);
  if (finishedAt === null) return false;
  return now - finishedAt <= RECENT_DELIVERY_WINDOW_MS;
}

/**
 * Quem já está na rua (PICKED_UP) vem antes de quem ainda precisa ser
 * coletado (ACCEPTED) - é a corrida que está correndo. Empate desempata pela
 * mais antiga, que é a que está esperando há mais tempo.
 */
const ACTIVE_RANK: Partial<Record<DeliveryStatus, number>> = {
  PICKED_UP: 0,
  ACCEPTED: 1,
};

export function sortActive(deliveries: Delivery[]): Delivery[] {
  return [...deliveries].sort((a, b) => {
    const rank = (ACTIVE_RANK[a.status] ?? 9) - (ACTIVE_RANK[b.status] ?? 9);
    if (rank !== 0) return rank;
    return getCreatedAt(a) - getCreatedAt(b);
  });
}

/** Disponíveis: a que está parada há mais tempo primeiro. */
export function sortOldestFirst(deliveries: Delivery[]): Delivery[] {
  return [...deliveries].sort((a, b) => getCreatedAt(a) - getCreatedAt(b));
}

/** Fechadas: a mais recente primeiro. */
export function sortNewestFinishedFirst(deliveries: Delivery[]): Delivery[] {
  return [...deliveries].sort(
    (a, b) =>
      (getFinishedAt(b) ?? getCreatedAt(b)) -
      (getFinishedAt(a) ?? getCreatedAt(a)),
  );
}

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: "Disponível",
  ACCEPTED: "Coletar",
  PICKED_UP: "Na rua",
  DELIVERED: "Entregue",
  RECEIVED: "Recebida",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
};

/**
 * Exhaustivo de propósito: o `StatusBadge` antigo tratava PICKED_UP e jogava
 * todo o resto em "Aceita", então CANCELED aparecia como aceita se algum dia
 * chegasse na tela.
 */
export const STATUS_TONE: Record<DeliveryStatus, string> = {
  PENDING:
    "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  ACCEPTED:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  PICKED_UP:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  DELIVERED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  RECEIVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  CANCELED: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

/**
 * Endereço em duas linhas para leitura rápida na moto: a primeira é o que se
 * digita num porteiro eletrônico, a segunda situa o bairro.
 */
export function formatAddressLines(address?: Address): string[] {
  if (!address) return [];

  const line1 = [address.street, address.number].filter(Boolean).join(", ");
  const line2 = [address.neighborhood, address.city, address.state]
    .filter(Boolean)
    .join(" · ");

  return [line1, address.complement, line2, address.zipCode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
}

/**
 * Consulta do Google Maps montada a partir do endereço em TEXTO.
 *
 * Não usa `latitude`/`longitude` de propósito: hoje o cadastro do cliente
 * grava a coordenada de onde o celular estava no checkout (ou nenhuma, quando
 * o endereço foi criado pelo perfil), então mandar o entregador pro pino
 * salvo é mandar pro lugar errado. O texto o Maps geocodifica na hora.
 */
export function buildMapsLink(address?: Address): string | null {
  if (!address) return null;

  const query = [
    [address.street, address.number].filter(Boolean).join(", "),
    address.neighborhood,
    address.city,
    address.state,
    address.zipCode,
    "Brasil",
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  if (!query || query === "Brasil") return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * `order.company` e `order.customer` não são garantidos pelo contrato de
 * `GET /delivery/delivery-person/me` (delivery.md não documenta o
 * aninhamento). Lê defensivamente: quando vier, aparece; até lá, o fallback.
 */
export function getRestaurantName(delivery: Delivery): string {
  return delivery.order?.company?.tradeName?.trim() || "Restaurante";
}

export function getCustomerName(delivery: Delivery): string {
  return delivery.order?.customer?.name?.trim() || "Cliente";
}

/** Telefone só quando vier de verdade - o botão de ligar fica oculto sem ele. */
export function getCustomerPhone(delivery: Delivery): string | null {
  const phone = delivery.order?.customer?.phone?.trim();
  if (!phone) return null;

  const digits = onlyNumbers(phone);
  return digits.length >= 8 ? digits : null;
}

/**
 * Ganho do entregador. O backend ainda não manda esse campo, então hoje
 * devolve sempre null e o bloco fica oculto no card - melhor não mostrar
 * nada do que mostrar R$ 0,00 como se fosse o ganho real.
 */
export function getCourierEarnings(delivery: Delivery): number | null {
  const value = delivery.courierEarnings;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getOrderTotal(delivery: Delivery): number | null {
  const value = delivery.order?.totalValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** "3 disponíveis" / "1 disponível" - o plural de "disponível" é irregular. */
export function pluralizeAvailable(count: number): string {
  return count === 1 ? "1 disponível" : `${count} disponíveis`;
}

"use client";

import {
  Check,
  MapPin,
  MessageSquareText,
  Navigation,
  Package,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildMapsLink,
  canCancel,
  formatAddressLines,
  getCourierEarnings,
  getCustomerName,
  getCustomerPhone,
  getNextStatus,
  getOrderTotal,
  getRestaurantName,
  isAvailable,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/delivery";
import type { Delivery } from "@/services/api";
import { formatCurrency } from "@/utils";

type Props = {
  delivery: Delivery;
  onAccept?: (id: string) => void;
  onAdvance?: (delivery: Delivery) => void;
  onCancel?: (delivery: Delivery) => void;
  /** Esta entrega tem um request em andamento - só ela trava, não a tela. */
  busy?: boolean;
  /** Entregas fechadas: sem ações, só o registro do que aconteceu. */
  compact?: boolean;
};

function StatusChip({ status }: { status: Delivery["status"] }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide ${STATUS_TONE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DeliveryCard({
  delivery,
  onAccept,
  onAdvance,
  onCancel,
  busy = false,
  compact = false,
}: Props) {
  const addressLines = formatAddressLines(delivery.deliveryAddress);
  const mapsLink = buildMapsLink(delivery.deliveryAddress);
  const phone = getCustomerPhone(delivery);
  const orderTotal = getOrderTotal(delivery);
  const earnings = getCourierEarnings(delivery);
  const nextStatus = getNextStatus(delivery);
  const observations = delivery.observations?.trim();

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[13px] font-bold text-foreground">
            {addressLines[0] || getRestaurantName(delivery)}
          </p>
          <StatusChip status={delivery.status} />
        </div>
        <p className="mt-1 truncate text-[12px] font-medium text-muted-foreground">
          {getRestaurantName(delivery)} · Pedido #{delivery.orderId.slice(0, 8)}
          {orderTotal !== null && ` · ${formatCurrency(orderTotal)}`}
        </p>
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="truncate text-[14px] font-extrabold text-foreground">
          {getRestaurantName(delivery)}
        </p>
        <StatusChip status={delivery.status} />
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Entregar em
            </p>
            {addressLines.length > 0 ? (
              <>
                <p className="mt-0.5 text-[16px] font-bold leading-snug text-foreground">
                  {addressLines[0]}
                </p>
                {addressLines.slice(1).map((line) => (
                  <p
                    key={line}
                    className="text-[13px] font-medium leading-snug text-muted-foreground"
                  >
                    {line}
                  </p>
                ))}
              </>
            ) : (
              <p className="mt-0.5 text-[15px] font-bold text-foreground">
                Endereço não informado
              </p>
            )}
            {delivery.deliveryAddress?.reference && (
              <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                Referência: {delivery.deliveryAddress.reference}
              </p>
            )}
          </div>
        </div>

        {observations && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-950/40">
            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Observação
              </p>
              <p className="mt-0.5 text-[14px] font-semibold leading-snug text-amber-900 dark:text-amber-200">
                {observations}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-muted px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Cliente
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground">
            {getCustomerName(delivery)}
          </p>
        </div>

        <dl className="space-y-1.5">
          {orderTotal !== null && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] font-semibold text-muted-foreground">
                Total do pedido
              </dt>
              <dd className="text-[14px] font-bold text-foreground">
                {formatCurrency(orderTotal)}
              </dd>
            </div>
          )}
          {/* Só aparece quando o backend passar a mandar o ganho - ver
              `courierEarnings` em services/api.ts. */}
          {earnings !== null && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] font-bold text-foreground">
                Seu ganho
              </dt>
              <dd className="text-[17px] font-extrabold text-[#1b7f4c] dark:text-emerald-400">
                {formatCurrency(earnings)}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[12px] font-medium text-muted-foreground">
              Pedido
            </dt>
            <dd className="text-[12px] font-semibold text-muted-foreground">
              #{delivery.orderId.slice(0, 8)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3.5">
        {isAvailable(delivery) && onAccept && (
          <Button
            type="button"
            onClick={() => onAccept(delivery.id)}
            disabled={busy}
            className="h-14 w-full rounded-xl bg-orange-500 text-[16px] font-extrabold text-white hover:bg-orange-600"
          >
            <Package className="mr-2 h-5 w-5" />
            {busy ? "Aceitando..." : "Aceitar entrega"}
          </Button>
        )}

        {nextStatus && onAdvance && (
          <Button
            type="button"
            onClick={() => onAdvance(delivery)}
            disabled={busy}
            className={
              nextStatus === "DELIVERED"
                ? "h-14 w-full rounded-xl bg-[#1b7f4c] text-[16px] font-extrabold text-white hover:bg-[#166b40]"
                : "h-14 w-full rounded-xl bg-zinc-900 text-[16px] font-extrabold text-white hover:bg-zinc-800"
            }
          >
            <Check className="mr-2 h-5 w-5" />
            {busy
              ? "Confirmando..."
              : nextStatus === "DELIVERED"
                ? "Entreguei o pedido"
                : "Coletei o pedido"}
          </Button>
        )}

        <div className="flex gap-2">
          {mapsLink && (
            <Button
              asChild
              variant="outline"
              className="h-12 flex-1 rounded-xl text-[14px] font-bold"
            >
              <a href={mapsLink} target="_blank" rel="noopener noreferrer">
                <Navigation className="mr-1.5 h-4 w-4" />
                Abrir no Maps
              </a>
            </Button>
          )}
          {/* Oculto até o telefone vir no payload do backend. */}
          {phone && (
            <Button
              asChild
              variant="outline"
              className="h-12 flex-1 rounded-xl text-[14px] font-bold"
            >
              <a href={`tel:${phone}`}>
                <Phone className="mr-1.5 h-4 w-4" />
                Ligar
              </a>
            </Button>
          )}
        </div>

        {canCancel(delivery) && onCancel && (
          <button
            type="button"
            onClick={() => onCancel(delivery)}
            disabled={busy}
            className="h-11 rounded-xl text-[13px] font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Não consigo fazer essa entrega
          </button>
        )}
      </div>
    </article>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_ACCEPT_DISTANCE_KM,
  SUPPORT_EMAIL,
  type AcceptDistanceCheck,
} from "@/lib/accept-distance";
import { getRestaurantName } from "@/lib/delivery";
import type { Delivery } from "@/services/api";

export type AcceptBlock = Exclude<AcceptDistanceCheck, { ok: true }>;

type Props = {
  /** A entrega bloqueada, ou null com o diálogo fechado. */
  delivery: Delivery | null;
  block: AcceptBlock | null;
  onClose: () => void;
  /** Abre o diálogo de localização - a posição pode estar errada. */
  onFixLocation: () => void;
};

const formatKm = (km: number) =>
  km.toLocaleString("pt-BR", { maximumFractionDigits: km < 10 ? 1 : 0 });

/** E-mail já com o que o suporte precisa pra achar a entrega. */
function supportMailto(delivery: Delivery) {
  const subject = "Problema ao aceitar entrega";
  const body = [
    "Não consegui aceitar uma entrega: o endereço do cliente veio sem localização.",
    "",
    `Entrega: ${delivery.id}`,
    `Pedido: #${delivery.orderId.slice(0, 8)}`,
    `Restaurante: ${getRestaurantName(delivery)}`,
    "",
    "Detalhes do problema:",
    "",
  ].join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

/**
 * Aceite barrado antes de sair pro backend (LDMF-321): longe demais do
 * cliente, ou o endereço do cliente sem coordenada pra conferir.
 */
export function AcceptBlockedDialog({
  delivery,
  block,
  onClose,
  onFixLocation,
}: Props) {
  const open = Boolean(delivery && block);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {delivery && block?.reason === "too-far" && (
          <>
            <DialogHeader>
              <DialogTitle>Você está longe demais desta entrega</DialogTitle>
              <DialogDescription>
                Pela sua localização, o cliente está a{" "}
                {formatKm(block.km)} km de você. Pra aceitar, você precisa estar
                a até {MAX_ACCEPT_DISTANCE_KM} km.
              </DialogDescription>
            </DialogHeader>
            <p className="text-[13px] font-medium text-muted-foreground">
              Se você está mais perto do que isso, a sua localização pode estar
              errada - corrija e tente de novo.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-12 rounded-xl"
              >
                Fechar
              </Button>
              <Button
                type="button"
                onClick={onFixLocation}
                className="h-12 rounded-xl bg-brand-500 text-[15px] font-bold text-white hover:bg-brand-600"
              >
                Corrigir localização
              </Button>
            </DialogFooter>
          </>
        )}

        {delivery && block?.reason === "no-customer-coords" && (
          <>
            <DialogHeader>
              <DialogTitle>Não dá pra aceitar esta entrega</DialogTitle>
              <DialogDescription>
                O endereço do cliente veio sem localização, então não
                conseguimos conferir a distância até ele.
              </DialogDescription>
            </DialogHeader>
            <p className="text-[13px] font-medium text-muted-foreground">
              Avise o suporte em {SUPPORT_EMAIL} contando o que aconteceu - o
              e-mail já vai com os dados da entrega.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-12 rounded-xl"
              >
                Fechar
              </Button>
              <Button
                asChild
                className="h-12 rounded-xl bg-brand-500 text-[15px] font-bold text-white hover:bg-brand-600"
              >
                <a href={supportMailto(delivery)}>Enviar e-mail</a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

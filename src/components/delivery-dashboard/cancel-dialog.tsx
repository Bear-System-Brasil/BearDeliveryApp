"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatAddressLines } from "@/lib/delivery";
import type { Delivery } from "@/services/api";

type Props = {
  /** A entrega sendo cancelada, ou null com o diálogo fechado. */
  delivery: Delivery | null;
  isCanceling: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function CancelDialog({
  delivery,
  isCanceling,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");

  // Cada entrega começa com o campo limpo - senão o motivo digitado pra uma
  // reaparece na próxima, e com várias corridas abertas isso é fácil de
  // acontecer sem o entregador perceber.
  useEffect(() => {
    setReason("");
  }, [delivery?.id]);

  const addressLine = delivery
    ? formatAddressLines(delivery.deliveryAddress)[0]
    : null;

  return (
    <Dialog open={Boolean(delivery)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar entrega</DialogTitle>
          {addressLine && (
            <DialogDescription>{addressLine}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="cancel-reason"
            className="text-sm font-medium text-foreground"
          >
            Motivo do cancelamento
          </label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex: endereço inacessível, cliente não atende..."
            rows={3}
            className="rounded-xl"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-12 rounded-xl"
          >
            Voltar
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={isCanceling || !reason.trim()}
            className="h-12 rounded-xl bg-red-500 text-white hover:bg-red-600"
          >
            {isCanceling ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  /** A entrega sendo devolvida, ou null com o diálogo fechado. */
  delivery: Delivery | null;
  isReturning: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

/**
 * "Não consigo fazer essa entrega": devolve a corrida pra lista de
 * disponíveis. Não cancela - a entrega continua valendo pro cliente e outro
 * entregador pode aceitar.
 */
export function ReturnDialog({
  delivery,
  isReturning,
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
          <DialogTitle>Devolver entrega</DialogTitle>
          <DialogDescription>
            {addressLine && (
              <span className="block font-semibold text-foreground">
                {addressLine}
              </span>
            )}
            Ela volta para a lista de disponíveis e outro entregador pode
            aceitar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="return-reason"
            className="text-sm font-medium text-foreground"
          >
            Motivo da devolução
          </label>
          <Textarea
            id="return-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex: moto com problema, imprevisto..."
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
            disabled={isReturning || !reason.trim()}
            className="h-12 rounded-xl bg-red-500 text-white hover:bg-red-600"
          >
            {isReturning ? "Devolvendo..." : "Confirmar devolução"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

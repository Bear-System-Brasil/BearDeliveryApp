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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaymentMethod } from "@/services/api";
import { useEffect, useState } from "react";

/** Formas que existem no pagamento na entrega (sem transferência). */
export const CHANGEABLE_PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.CASH, label: "Dinheiro" },
  { value: PaymentMethod.CREDIT_CARD, label: "Crédito" },
  { value: PaymentMethod.DEBIT_CARD, label: "Débito" },
  { value: PaymentMethod.PIX, label: "PIX" },
];

interface ChangePaymentMethodDialogProps {
  open: boolean;
  onClose: () => void;
  /** Forma gravada hoje: aparece marcada como "atual" e não pode ser escolhida. */
  currentMethod?: string;
  /** Devolve `true` quando deu certo; só então a janela fecha. */
  onConfirm: (method: PaymentMethod, note: string) => Promise<boolean>;
  title: string;
  description: string;
  confirmLabel: string;
  /** Campo de observação opcional (usado no aviso do entregador ao gerente). */
  withNote?: boolean;
  isLoading?: boolean;
}

/**
 * Janela de troca da forma de pagamento. Serve aos dois lados: a gerência
 * altera direto (Finanças e tela do entregador) e o entregador avisa a
 * gerência. Quem chama decide o texto e o que acontece no confirmar.
 */
export function ChangePaymentMethodDialog({
  open,
  onClose,
  currentMethod,
  onConfirm,
  title,
  description,
  confirmLabel,
  withNote,
  isLoading,
}: ChangePaymentMethodDialogProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setNote("");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!selected) return;
    const ok = await onConfirm(selected, note.trim());
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <Label>Forma que o cliente usou</Label>
          <div className="grid grid-cols-2 gap-2">
            {CHANGEABLE_PAYMENT_METHODS.map((option) => {
              const isCurrent = option.value === currentMethod;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={selected === option.value ? "default" : "outline"}
                  disabled={isCurrent}
                  aria-pressed={selected === option.value}
                  className="h-12 cursor-pointer text-base"
                  onClick={() => setSelected(option.value)}
                >
                  {option.label}
                  {isCurrent && (
                    <span className="ml-1 text-xs font-normal">(atual)</span>
                  )}
                </Button>
              );
            })}
          </div>

          {withNote && (
            <div className="space-y-1.5">
              <Label htmlFor="change-payment-note">Observação (opcional)</Label>
              <Textarea
                id="change-payment-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: cliente pediu para passar no crédito"
                className="min-h-20"
                maxLength={500}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 cursor-pointer"
          >
            Voltar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || isLoading}
            className="h-12 cursor-pointer"
          >
            {isLoading ? "Enviando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useCourierPosition,
  type PositionFailure,
} from "@/hooks/use-courier-position";

const FAILURE_MESSAGE: Record<PositionFailure, string> = {
  denied: "Você bloqueou o acesso à localização neste aparelho.",
  timeout: "O GPS demorou demais pra responder.",
  unavailable: "Não foi possível ler o GPS agora.",
  unsupported: "Este aparelho não tem localização disponível.",
};

type Props = {
  open: boolean;
  /**
   * Por que o diálogo abriu: no aceite a posição é obrigatória pra seguir;
   * abrindo pelo botão do cabeçalho é só ajuste, e fechar não custa nada.
   */
  purpose: "accept" | "adjust";
  /** Motivo da falha do GPS, quando foi ela que abriu o diálogo. */
  failure?: PositionFailure | null;
  onClose: () => void;
  /** Posição confirmada - no aceite, é aqui que a entrega segue. */
  onConfirmed: () => void;
};

export function LocationDialog({
  open,
  purpose,
  failure,
  onClose,
  onConfirmed,
}: Props) {
  const { position, isLocating, isGeocoding, refreshFromGps, setFromText } =
    useCourierPosition();

  const [text, setText] = useState("");

  // Reabrir o diálogo não traz o texto da vez passada - o entregador se moveu,
  // e reaproveitar o endereço antigo é justamente o erro que queremos evitar.
  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const handleGps = async () => {
    const outcome = await refreshFromGps();

    if (outcome.ok) {
      toast.success("Localização atualizada pelo GPS.");
      onConfirmed();
      return;
    }

    toast.error(FAILURE_MESSAGE[outcome.reason]);
  };

  const handleText = async () => {
    const ok = await setFromText(text);

    if (!ok) {
      toast.error(
        "Não encontramos esse endereço. Tente com rua, número e cidade.",
      );
      return;
    }

    toast.success("Localização registrada.");
    onConfirmed();
  };

  const busy = isLocating || isGeocoding;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {purpose === "accept" ? "Onde você está?" : "Corrigir localização"}
          </DialogTitle>
          <DialogDescription>
            {purpose === "accept"
              ? "Precisamos da sua posição pra calcular o frete desta corrida."
              : "Informe onde você está pra o frete das próximas corridas sair certo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {failure && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {FAILURE_MESSAGE[failure]}
            </p>
          )}

          {position && (
            <div className="flex items-start gap-2.5 rounded-xl bg-muted px-3 py-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Posição atual
                </p>
                <p className="mt-0.5 text-[13.5px] font-semibold text-foreground">
                  {position.label ??
                    `${position.coords.lat.toFixed(5)}, ${position.coords.lng.toFixed(5)}`}
                </p>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleGps}
            disabled={busy}
            className="h-12 w-full rounded-xl text-[14px] font-bold"
          >
            <Crosshair className="mr-2 h-4 w-4" />
            {isLocating ? "Procurando GPS..." : "Tentar pelo GPS"}
          </Button>

          <div className="space-y-1.5">
            <label
              htmlFor="courier-location"
              className="text-[13px] font-semibold text-foreground"
            >
              Ou digite onde você está
            </label>
            <Input
              id="courier-location"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Rua, número e cidade"
              autoComplete="off"
              className="h-12 rounded-xl"
            />
            <p className="text-[12px] font-medium text-muted-foreground">
              Quanto mais completo, melhor o frete sai certo.
            </p>
          </div>
        </div>

        <DialogFooter>
          {/* No aceite, fechar cancela a corrida - o rótulo diz isso. */}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
            className="h-12 rounded-xl"
          >
            {purpose === "accept" ? "Não aceitar" : "Fechar"}
          </Button>
          <Button
            type="button"
            onClick={handleText}
            disabled={busy || !text.trim()}
            className="h-12 rounded-xl bg-brand-500 text-[15px] font-bold text-white hover:bg-brand-600"
          >
            {isGeocoding ? "Buscando..." : "Usar este endereço"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCancelOrder } from "@/hooks";

type Props = {
  setIsOpen: (val: boolean) => void;
  isOpen: boolean;
  deliveryId: string;
};

export function CancelForm({ isOpen, setIsOpen, deliveryId }: Props) {
  const { mutateAsync: cancelOrder, isPending } = useCancelOrder();

  const handleCancelOrder = async () => {
    try {
      await cancelOrder(deliveryId);
      setIsOpen(false);
    } catch {
      // O hook já avisou o erro; o diálogo fica aberto para tentar de novo.
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <form>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar entrega</DialogTitle>
            <DialogDescription className="sr-only">
              Fazer o cancelamento de uma entrega
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <Label htmlFor="reason">Motivo do cancelamento</Label>
              <Input id="reason" name="reason" placeholder="..." />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              onClick={handleCancelOrder}
              disabled={isPending}
              variant={"destructive"}
              className="text-white"
            >
              Cancelar entrega
            </Button>

            <DialogClose asChild>
              <Button>Voltar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

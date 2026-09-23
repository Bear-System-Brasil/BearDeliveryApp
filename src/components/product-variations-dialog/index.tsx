"use client";

import { Button } from "@/components/ui/button";
import { CurrencyCentsInput } from "@/components/ui/currency-cents-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StockQuantityInput } from "@/components/ui/stock-quantity-input";
import { useConfirm } from "@/contexts/confirm-provider";
import { cn } from "@/lib/utils";
import {
  useCreateProductVariation,
  useDeleteProductVariation,
  useProductVariations,
  useUpdateProductVariation,
} from "@/hooks";
import type { ProductVariation } from "@/services/api";
import { formatCurrency } from "@/utils";
import { Edit, Loader2, Plus, Ruler, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  productId: string | null;
  productName?: string;
  /**
   * Preço base do prato. O formulário trabalha com o preço TOTAL do
   * tamanho (o que o cliente vê e paga); o backend continua guardando
   * `priceModifier` como delta sobre esse valor, então a conversão nos
   * dois sentidos acontece aqui dentro.
   */
  salePrice: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  totalPrice: number | undefined;
  stockQuantity: number | undefined;
  isAvailable: boolean;
}

const emptyForm: FormState = {
  name: "",
  totalPrice: undefined,
  stockQuantity: undefined,
  isAvailable: true,
};

/**
 * Somar e subtrair o preço base a cada ida e volta acumula dízima binária
 * (30,10 - 20,00 = 10.099999999999998). Arredonda pra centavo antes de
 * mandar pro backend e antes de exibir.
 */
const roundToCents = (value: number) => Math.round(value * 100) / 100;

const fieldClassName =
  "h-9 rounded-[10px] border-border bg-card text-xs shadow-none focus-visible:ring-1 focus-visible:ring-brand-500";

export function ProductVariationsDialog({
  productId,
  productName,
  salePrice,
  open,
  onOpenChange,
}: Props) {
  const { confirm } = useConfirm();
  const { data: variations = [], isLoading } = useProductVariations(productId);
  const createVariation = useCreateProductVariation();
  const updateVariation = useUpdateProductVariation();
  const deleteVariation = useDeleteProductVariation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const isSaving = createVariation.isPending || updateVariation.isPending;

  const trimmedName = form.name.trim();
  // Total abaixo da base viraria priceModifier negativo, ou seja, um
  // tamanho que barateia o prato - não é o que a tela promete.
  const isBelowBasePrice =
    form.totalPrice !== undefined && form.totalPrice < salePrice;
  const isDuplicateName = variations.some(
    (v) =>
      v.id !== editingId &&
      v.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (variation: ProductVariation) => {
    setEditingId(variation.id);
    setForm({
      name: variation.name,
      totalPrice: roundToCents(salePrice + variation.priceModifier),
      stockQuantity: variation.stockQuantity,
      isAvailable: variation.isAvailable,
    });
  };

  const handleSubmit = async () => {
    if (!productId) return;
    if (
      !form.name.trim() ||
      form.totalPrice === undefined ||
      form.stockQuantity === undefined
    ) {
      return;
    }
    if (isDuplicateName || isBelowBasePrice) return;

    const data = {
      name: form.name.trim(),
      priceModifier: roundToCents(form.totalPrice - salePrice),
      stockQuantity: form.stockQuantity,
      isAvailable: form.isAvailable,
    };

    if (editingId) {
      await updateVariation.mutateAsync({ id: editingId, productId, data });
    } else {
      await createVariation.mutateAsync({ productId, data });
    }

    resetForm();
  };

  const handleDelete = async (variation: ProductVariation) => {
    if (!productId) return;

    const ok = await confirm({
      title: "Remover tamanho?",
      description: `"${variation.name}" vai deixar de aparecer pros clientes.`,
      confirmText: "Remover",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;

    await deleteVariation.mutateAsync({ id: variation.id, productId });
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] rounded-[14px] border-border bg-card p-0 shadow-[0_24px_70px_rgba(20,22,26,0.18)] sm:max-w-[480px]">
        <DialogHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 sm:px-6">
          <DialogTitle className="text-base font-extrabold text-foreground sm:text-lg">
            Tamanhos
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-muted-foreground sm:text-sm">
            {productName
              ? `Variações de tamanho de "${productName}"`
              : "Variações de tamanho deste prato"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid gap-2 rounded-[10px] border border-border bg-muted p-3">
            <div className="grid grid-cols-[1fr_110px_90px] gap-2">
              <div className="grid gap-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Nome *
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Grande"
                  maxLength={100}
                  className={cn(
                    fieldClassName,
                    isDuplicateName &&
                      "border-red-400 focus-visible:ring-red-400",
                  )}
                />
                {isDuplicateName && (
                  <p className="text-[10.5px] font-semibold text-red-500 dark:text-red-400">
                    Já existe um tamanho com esse nome
                  </p>
                )}
              </div>
              <div className="grid gap-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Preço *
                </Label>
                <CurrencyCentsInput
                  value={form.totalPrice}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, totalPrice: value }))
                  }
                  maskWhileTyping
                  placeholder="R$ 0,01"
                  className={cn(
                    fieldClassName,
                    isBelowBasePrice &&
                      "border-red-400 focus-visible:ring-red-400",
                  )}
                />
                {isBelowBasePrice && (
                  <p className="text-[10.5px] font-semibold text-red-500">
                    Mín. {formatCurrency(salePrice)}
                  </p>
                )}
              </div>
              <div className="grid gap-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Estoque *
                </Label>
                <StockQuantityInput
                  value={form.stockQuantity}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, stockQuantity: value }))
                  }
                  placeholder="—"
                  minValue={0}
                  maxValue={9999}
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[11.5px] font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isAvailable: e.target.checked,
                    }))
                  }
                  className="h-3.5 w-3.5 cursor-pointer accent-brand-500"
                />
                Disponível
              </label>

              <div className="flex gap-1.5">
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetForm}
                    className="h-8 cursor-pointer rounded-[8px] px-2.5 text-[11.5px] font-bold text-muted-foreground hover:bg-card"
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    isSaving ||
                    !form.name.trim() ||
                    form.totalPrice === undefined ||
                    form.stockQuantity === undefined ||
                    isDuplicateName ||
                    isBelowBasePrice
                  }
                  className="h-8 cursor-pointer rounded-[8px] bg-brand-500 px-2.5 text-[11.5px] font-extrabold text-white hover:bg-brand-600"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : editingId ? (
                    "Salvar"
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 divide-y divide-border">
            {isLoading &&
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 py-2.5">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}

            {!isLoading && variations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[10px] bg-muted text-brand-500">
                  <Ruler className="h-5 w-5" />
                </div>
                <p className="text-[12.5px] font-bold text-foreground">
                  Nenhum tamanho cadastrado
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  Adicione o primeiro tamanho acima
                </p>
              </div>
            )}

            {!isLoading &&
              variations.map((variation) => (
                <div
                  key={variation.id}
                  className="flex items-center gap-2 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-foreground">
                      {variation.name}
                    </p>
                    <p className="text-[10.5px] font-semibold text-muted-foreground">
                      {variation.isAvailable ? "Disponível" : "Indisponível"}
                      {variation.stockQuantity !== undefined &&
                        ` · ${variation.stockQuantity} em estoque`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12.5px] font-extrabold text-foreground">
                    {formatCurrency(roundToCents(salePrice + variation.priceModifier))}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(variation)}
                      aria-label={`Editar ${variation.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground transition-colors hover:bg-muted"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(variation)}
                      aria-label={`Remover ${variation.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { AdminPageLayout } from "@/components/admin-page-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinancialPreferencesStore } from "@/stores";
import { PaymentMethod } from "@/services/api";
import { Info, RotateCcw, Settings, ShieldCheck, Wallet } from "lucide-react";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.CREDIT_CARD]: "Cartão de Crédito",
  [PaymentMethod.DEBIT_CARD]: "Cartão de Débito",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.BANK_TRANSFER]: "Transferência Bancária",
};

export default function SettingsPage() {
  const {
    defaultPaymentMethod,
    confirmBeforeCloseRegister,
    setDefaultPaymentMethod,
    setConfirmBeforeCloseRegister,
    resetFinancialPreferences,
  } = useFinancialPreferencesStore();

  return (
    <AdminPageLayout
      title="Configurações"
      icon={Settings}
      mainClassName="p-4 pb-20 sm:p-6 md:pb-10 lg:pl-64 lg:pr-8"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-sm text-muted-foreground">
          Preferências de operação do caixa e do financeiro.
        </p>

        <div className="flex items-start gap-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-3 text-sm text-blue-800 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Essas preferências ficam salvas só neste navegador - não existe
            ainda uma configuração financeira centralizada no servidor, então
            cada computador que opera o caixa define as suas.
          </span>
        </div>

        {/* Movimentação de caixa */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-semibold">Movimentação de caixa</h3>
              <p className="text-xs text-muted-foreground">
                Aplica-se às telas de Controle de Caixa e Dashboard
              </p>
            </div>
          </div>

          <div className="max-w-xs">
            <Label>Método de pagamento padrão</Label>
            <Select
              value={defaultPaymentMethod}
              onValueChange={(v) => setDefaultPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PaymentMethod).map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Pré-selecionado ao abrir sangria, suprimento, venda manual ou
              reembolso.
            </p>
          </div>
        </div>

        {/* Segurança operacional */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-semibold">Segurança operacional</h3>
              <p className="text-xs text-muted-foreground">
                Evita fechamentos de caixa por engano
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5">
            <Checkbox
              checked={confirmBeforeCloseRegister}
              onCheckedChange={(checked) =>
                setConfirmBeforeCloseRegister(checked === true)
              }
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-sm">
              <span className="font-medium">
                Confirmar antes de fechar o caixa
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Exige marcar uma confirmação extra no diálogo de fechamento
                antes de liberar o botão de confirmar - fechamento não pode
                ser desfeito.
              </p>
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFinancialPreferences}
            className="gap-2 rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>
        </div>
      </div>
    </AdminPageLayout>
  );
}

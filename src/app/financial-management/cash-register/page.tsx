"use client";

import { AdminPageLayout } from "@/components/admin-page-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCashDeposit,
  useCashMovementSummary,
  useCashMovements,
  useCashRefund,
  useCashRegister,
  useCashSale,
  useCashWithdrawal,
  useCloseCashRegister,
  useOpenCashRegister,
} from "@/hooks";
import { cn } from "@/lib/utils";
import {
  type CashMovement,
  CashMovementSource,
  CashMovementType,
  PaymentMethod,
} from "@/services/api";
import { useAuthStore, useFinancialPreferencesStore } from "@/stores";
import { formatCurrency } from "@/utils";
import { Banknote, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { type ReactNode, useState } from "react";

type MovementType = "withdrawal" | "deposit" | "sale" | "refund";
type DialogKind = "open-register" | "movement" | null;

/** O método preferido vem do localStorage; um valor obsoleto ali não pode
 *  virar corpo de requisição, então cai pra "sem seleção". */
function toPaymentMethod(value?: string): PaymentMethod | "" {
  return Object.values(PaymentMethod).includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : "";
}

/** Tipo com que o diálogo de movimento abre. */
const INITIAL_MOVEMENT_TYPE: MovementType = "withdrawal";

/**
 * Sangria abre SEM método pré-selecionado. É a única operação que retira
 * dinheiro, e um padrão aceito por inércia pode significar retirar de um
 * método sem saldo - exatamente o que o backend passou a barrar agora que
 * valida saldo por método.
 *
 * Os outros três mantêm a preferência: venda e suprimento se repetem muito
 * dentro do turno, e reembolso costuma estar amarrado a um pagamento.
 */
function initialPaymentMethod(
  type: MovementType,
  preferred?: string,
): PaymentMethod | "" {
  return type === "withdrawal" ? "" : toPaymentMethod(preferred);
}

const MOVEMENT_OPTIONS: { value: MovementType; label: string }[] = [
  { value: "withdrawal", label: "Sangria" },
  { value: "deposit", label: "Suprimento" },
  { value: "sale", label: "Venda" },
  { value: "refund", label: "Reembolso" },
];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.CREDIT_CARD]: "Cartão de Crédito",
  [PaymentMethod.DEBIT_CARD]: "Cartão de Débito",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.BANK_TRANSFER]: "Transferência Bancária",
};

const fieldClass =
  "h-9 w-full rounded-[9px] border border-border bg-muted px-2.5 text-[12.5px] font-semibold text-foreground outline-none";

const MOVEMENTS_PAGE_SIZE = 20;

const MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  [CashMovementType.SALE]: "Venda",
  [CashMovementType.DEPOSIT]: "Suprimento",
  [CashMovementType.WITHDRAWAL]: "Sangria",
  [CashMovementType.REFUND]: "Reembolso",
};

const MOVEMENT_TYPE_BADGE: Record<CashMovementType, string> = {
  [CashMovementType.SALE]: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  [CashMovementType.DEPOSIT]: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
  [CashMovementType.WITHDRAWAL]: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
  [CashMovementType.REFUND]: "bg-brand-50 dark:bg-brand-950/40 text-amber-700 dark:text-amber-400",
};

/** Sangria e reembolso tiram dinheiro do caixa; venda e suprimento põem. */
const MOVEMENT_OUTFLOW: Record<CashMovementType, boolean> = {
  [CashMovementType.SALE]: false,
  [CashMovementType.DEPOSIT]: false,
  [CashMovementType.WITHDRAWAL]: true,
  [CashMovementType.REFUND]: true,
};

const MOVEMENT_SOURCE_LABELS: Record<CashMovementSource, string> = {
  [CashMovementSource.AUTOMATIC]: "Automático",
  [CashMovementSource.MANUAL]: "Manual",
};

const MOVEMENT_TYPE_FILTERS: { value: CashMovementType | "ALL"; label: string }[] =
  [
    { value: "ALL", label: "Todos os tipos" },
    ...Object.values(CashMovementType).map((type) => ({
      value: type,
      label: MOVEMENT_TYPE_LABELS[type],
    })),
  ];

const MOVEMENT_METHOD_FILTERS: { value: PaymentMethod | "ALL"; label: string }[] =
  [
    { value: "ALL", label: "Todos os métodos" },
    ...Object.values(PaymentMethod).map((method) => ({
      value: method,
      label: PAYMENT_METHOD_LABELS[method],
    })),
  ];

const MOVEMENTS_GRID = "76px 104px 1fr 116px 104px 116px";

const movementHeaderClass =
  "text-[10px] font-extrabold tracking-[0.05em] text-muted-foreground";

function movementDate(movement: CashMovement) {
  return movement.createdAt ?? movement.created_at;
}

function formatDateTimeShort(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** Valor com o sinal do efeito no caixa - o backend manda o módulo. */
function movementSignedAmount(movement: CashMovement) {
  const magnitude = Math.abs(movement.amount ?? 0);
  return MOVEMENT_OUTFLOW[movement.type] ? -magnitude : magnitude;
}

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Valor com sinal explícito. `formatCurrency` de um negativo devolve
 * "-R$ 100,00"; concatenar isso num "+ " fixo produzia o "+ −R$ 100,00" que
 * aparecia na conferência. Aqui o sinal vem do próprio número.
 */
function formatSigned(value: number) {
  const sign = value < 0 ? "−" : "+";
  return `${sign} ${formatCurrency(Math.abs(value))}`;
}

function StatCard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-card px-[14px] py-[13px]">
      <div className="whitespace-nowrap text-[11.5px] font-semibold text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 whitespace-nowrap text-[19px] font-extrabold text-foreground",
          valueClassName,
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 whitespace-nowrap text-[11px] font-semibold text-muted-foreground">
        {sub}
      </div>
    </div>
  );
}

function CompactButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      {...props}
      className={cn(
        "h-9 shrink-0 rounded-[9px] bg-muted px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

function ModalTitle({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <DialogTitle className="text-[16px] font-extrabold tracking-tight text-foreground">
        {children}
      </DialogTitle>
      <Button
        onClick={onClose}
        className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-muted text-xs text-foreground"
      >
        ✕
      </Button>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[6px] text-[11.5px] font-bold text-foreground">
      {children}
    </div>
  );
}

export default function CashRegisterPage() {
  const { user } = useAuthStore();
  const { defaultPaymentMethod, confirmBeforeCloseRegister } =
    useFinancialPreferencesStore();
  const {
    data: register,
    isLoading: registerLoading,
    refetch: refetchRegister,
  } = useCashRegister();
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useCashMovementSummary();

  const openMutation = useOpenCashRegister();
  const closeMutation = useCloseCashRegister();
  const withdrawalMutation = useCashWithdrawal();
  const depositMutation = useCashDeposit();
  const saleMutation = useCashSale();
  const refundMutation = useCashRefund();

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [movementType, setMovementType] =
    useState<MovementType>(INITIAL_MOVEMENT_TYPE);

  const [openingBalance, setOpeningBalance] = useState("");
  const [openObs, setOpenObs] = useState("");
  const [countedTotal, setCountedTotal] = useState("");
  const [closeObs, setCloseObs] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(() =>
    initialPaymentMethod(INITIAL_MOVEMENT_TYPE, defaultPaymentMethod),
  );
  const [description, setDescription] = useState("");
  const [closeConfirmed, setCloseConfirmed] = useState(false);

  const [movementsPage, setMovementsPage] = useState(1);
  const [movementTypeFilter, setMovementTypeFilter] = useState<
    CashMovementType | "ALL"
  >("ALL");
  const [movementMethodFilter, setMovementMethodFilter] = useState<
    PaymentMethod | "ALL"
  >("ALL");

  const isRegisterOpen = !!register;

  // Extrato do caixa aberto: sem o id do caixa a rota devolveria movimento de
  // turno anterior, então a busca só sai depois que o caixa carrega.
  const {
    data: movementsData,
    isLoading: movementsLoading,
    isFetching: movementsFetching,
    isError: movementsError,
    refetch: refetchMovements,
  } = useCashMovements(
    {
      page: movementsPage,
      limit: MOVEMENTS_PAGE_SIZE,
      cashRegisterId: register?.id,
      type: movementTypeFilter === "ALL" ? undefined : movementTypeFilter,
      paymentMethod:
        movementMethodFilter === "ALL" ? undefined : movementMethodFilter,
    },
    { enabled: !!register?.id },
  );

  const movements = movementsData?.items ?? [];
  const movementsMeta = movementsData?.meta;
  const movementsTotalPages = movementsMeta?.totalPages ?? 1;

  // Filtro novo sempre volta pra página 1 (ver pagination.md).
  const changeMovementType = (value: CashMovementType | "ALL") => {
    setMovementTypeFilter(value);
    setMovementsPage(1);
  };

  const changeMovementMethod = (value: PaymentMethod | "ALL") => {
    setMovementMethodFilter(value);
    setMovementsPage(1);
  };

  const clearMovementFilters = () => {
    setMovementTypeFilter("ALL");
    setMovementMethodFilter("ALL");
    setMovementsPage(1);
  };

  const hasMovementFilters =
    movementTypeFilter !== "ALL" || movementMethodFilter !== "ALL";

  const resetMovementForm = (type: MovementType) => {
    setAmount("");
    setDescription("");
    setPaymentMethod(initialPaymentMethod(type, defaultPaymentMethod));
  };

  const closeDialog = () => {
    setDialog(null);
    setOpeningBalance("");
    setOpenObs("");
    resetMovementForm(movementType);
  };

  const handleRefresh = () => {
    refetchRegister();
    refetchSummary();
    refetchMovements();
  };

  const handleOpenRegister = async () => {
    const balance = parseFloat(openingBalance.replace(",", "."));
    if (isNaN(balance) || balance < 0) return;
    await openMutation.mutateAsync({
      openingBalance: balance,
      observations: openObs || undefined,
    });
    closeDialog();
  };

  const handleCloseRegister = async () => {
    const counted = parseFloat(countedTotal.replace(",", "."));
    if (isNaN(counted) || counted < 0) return;
    if (confirmBeforeCloseRegister && !closeConfirmed) return;
    await closeMutation.mutateAsync({
      countedTotal: counted,
      observations: closeObs || undefined,
    });
    setCountedTotal("");
    setCloseObs("");
    setCloseConfirmed(false);
  };

  const openMovementDialog = (type: MovementType) => {
    setMovementType(type);
    resetMovementForm(type);
    setDialog("movement");
  };

  // Trocar o tipo dentro do diálogo é trocar de operação, então o método é
  // reaplicado pela regra do tipo novo. Sem isso o padrão da venda vazaria
  // para a sangria por um clique no seletor.
  const switchMovementType = (type: MovementType) => {
    setMovementType(type);
    setPaymentMethod(initialPaymentMethod(type, defaultPaymentMethod));
  };

  const missingPaymentMethod = !paymentMethod;

  const handleConfirmMovement = async () => {
    const value = parseFloat(amount.replace(",", "."));
    if (isNaN(value) || value <= 0 || !description.trim()) return;

    // O cash-movement.md documenta o mesmo corpo nos quatro POST -
    // { amount, paymentMethod, description }. A guarda também estreita o
    // tipo de `paymentMethod`, então o payload sai sem cast.
    if (!paymentMethod) {
      toast.error("Selecione o método de pagamento");
      return;
    }

    const payload = { amount: value, paymentMethod, description };

    if (movementType === "withdrawal") {
      await withdrawalMutation.mutateAsync(payload);
    } else if (movementType === "deposit") {
      await depositMutation.mutateAsync(payload);
    } else if (movementType === "sale") {
      await saleMutation.mutateAsync(payload);
    } else {
      await refundMutation.mutateAsync(payload);
    }

    closeDialog();
  };

  const isMovementPending =
    withdrawalMutation.isPending ||
    depositMutation.isPending ||
    saleMutation.isPending ||
    refundMutation.isPending;

  // Fundo de troco + líquido em dinheiro. `totalCash` já vem do backend como
  // SALE + DEPOSIT − WITHDRAWAL − REFUND, então sangria e reembolso NÃO se
  // subtraem de novo aqui - era isso que fazia a sangria contar duas vezes.
  const registerOpeningBalance = register?.openingBalance ?? 0;
  const netCash = summary?.totalCash ?? 0;
  const expectedInDrawer =
    summary?.availableBalance ?? registerOpeningBalance + netCash;

  const hasContado = countedTotal.trim() !== "";
  const contadoVal = parseFloat(countedTotal.replace(",", "."));
  const difVal =
    hasContado && !isNaN(contadoVal) ? contadoVal - expectedInDrawer : 0;
  const difOk = hasContado && !isNaN(contadoVal) && Math.abs(difVal) < 0.005;
  const difSobra = hasContado && !isNaN(contadoVal) && difVal >= 0.005;
  const difFalta = hasContado && !isNaN(contadoVal) && difVal <= -0.005;

  const paymentBreakdown = summary
    ? [
        {
          label: "Dinheiro",
          value: summary.totalCash,
          gaveta: true,
        },
        { label: "PIX", value: summary.totalPix, gaveta: false },
        {
          label: "Cartão de Crédito",
          value: summary.totalCredit,
          gaveta: false,
        },
        {
          label: "Cartão de Débito",
          value: summary.totalDebit,
          gaveta: false,
        },
        {
          label: "Transferência",
          value: summary.totalTransfer,
          gaveta: false,
        },
      ]
    : [];
  // Os totais são líquidos, então um método pode fechar negativo (mais
  // sangria/reembolso do que venda). Somar tudo pra usar de base deixava a
  // participação sem sentido (PIX aparecia com 112%): a base é só o que
  // entrou de fato, e método negativo não tem participação a exibir.
  const paymentPositiveTotal = paymentBreakdown.reduce(
    (sum, m) => sum + Math.max(m.value, 0),
    0,
  );

  return (
    <AdminPageLayout
      title="Controle de Caixa"
      icon={Banknote}
      mainClassName="p-4 pb-20 sm:p-6 md:pb-10 lg:pl-64 lg:pr-8"
      actions={
        <Button
          onClick={handleRefresh}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3.5 text-xs font-bold text-brand-500 transition-colors hover:bg-brand-50 dark:hover:bg-brand-950/40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      }
    >
      <div className="mx-auto max-w-7xl">
        <p className="mb-3.5 text-[12.5px] font-medium text-muted-foreground">
          Abertura, fechamento e movimentos financeiros
        </p>

        {registerLoading ? (
          <Skeleton className="h-24 w-full rounded-[13px]" />
        ) : isRegisterOpen && register ? (
          <>
            {/* Banner de caixa aberto */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[13px] bg-zinc-900 px-[18px] py-[14px]">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-card/10 text-white">
                  <Banknote className="h-[19px] w-[19px]" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-extrabold tracking-tight text-white">
                      Caixa aberto
                    </span>
                    <span className="shrink-0 rounded-md bg-[#1F7A4D] px-2 py-0.5 text-[10px] font-extrabold text-white">
                      ABERTO
                    </span>
                  </div>
                  <div className="mt-[3px] flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] font-semibold text-muted-foreground">
                    <span className="whitespace-nowrap">
                      Operador: {user?.name || "—"}
                    </span>
                    <span className="whitespace-nowrap">
                      Aberto às {formatTime(register.openedAt)}
                    </span>
                    <span className="whitespace-nowrap">
                      Fundo de troco {formatCurrency(register.openingBalance)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-[7px]">
                <Button
                  onClick={() => openMovementDialog("deposit")}
                  className="h-[34px] rounded-[9px] bg-card/[.12] px-3.5 text-xs font-bold text-white hover:bg-card/20"
                >
                  + Entrada
                </Button>
                <Button
                  onClick={() => openMovementDialog("withdrawal")}
                  className="h-[34px] rounded-[9px] bg-card/[.12] px-3.5 text-xs font-bold text-white hover:bg-card/20"
                >
                  − Saída
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-3 lg:[grid-template-columns:repeat(auto-fit,minmax(440px,1fr))]">
              {/* Coluna principal */}
              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid grid-cols-1 gap-2.5 sm:[grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                  {summaryLoading ? (
                    <>
                      <Skeleton className="h-[74px] rounded-[12px]" />
                      <Skeleton className="h-[74px] rounded-[12px]" />
                      <Skeleton className="h-[74px] rounded-[12px]" />
                    </>
                  ) : (
                    <>
                      <StatCard
                        label="Vendas do turno"
                        value={formatCurrency(summary?.totalSales ?? 0)}
                        sub="Bruto, todos os métodos"
                      />
                      <StatCard
                        label="Entradas"
                        value={formatCurrency(summary?.totalDeposits ?? 0)}
                        sub="Suprimentos em dinheiro"
                        valueClassName="text-emerald-700 dark:text-emerald-400"
                      />
                      <StatCard
                        label="Saídas"
                        value={formatCurrency(summary?.totalWithdrawals ?? 0)}
                        sub="Sangrias em dinheiro"
                        valueClassName="text-red-600 dark:text-red-400"
                      />
                    </>
                  )}
                </div>

                {/* Formas de pagamento */}
                <div className="rounded-[13px] border border-border bg-card px-4 py-3.5">
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-[13px] font-extrabold text-foreground">
                      Formas de pagamento
                    </span>
                    <span className="whitespace-nowrap text-[11px] font-semibold text-muted-foreground">
                      Só dinheiro entra na gaveta
                    </span>
                  </div>
                  <p className="mb-3 text-[11px] font-semibold text-muted-foreground">
                    Valores líquidos: vendas + suprimentos − sangrias −
                    reembolsos.
                  </p>
                  {summaryLoading ? (
                    <div className="space-y-2.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton
                          key={i}
                          className="h-[30px] w-full rounded-[8px]"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[11px]">
                      {paymentBreakdown.map((m) => {
                        const isNegative = m.value < 0;
                        const share =
                          !isNegative && paymentPositiveTotal > 0
                            ? Math.min(
                                (m.value / paymentPositiveTotal) * 100,
                                100,
                              )
                            : 0;
                        return (
                          <div key={m.label}>
                            <div className="flex items-center gap-2">
                              <span className="min-w-[80px] flex-1 truncate text-[12.5px] font-bold text-foreground">
                                {m.label}
                              </span>
                              {m.gaveta && (
                                <span className="shrink-0 rounded-[5px] bg-brand-50 dark:bg-brand-950/40 px-[7px] py-px text-[9.5px] font-extrabold text-brand-600">
                                  GAVETA
                                </span>
                              )}
                              <span
                                className={cn(
                                  "w-[86px] shrink-0 text-right text-[12.5px] font-extrabold",
                                  isNegative
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-foreground",
                                )}
                              >
                                {formatSigned(m.value)}
                              </span>
                              <span
                                className="w-[34px] shrink-0 text-right text-[11px] font-bold text-muted-foreground"
                                title={
                                  isNegative
                                    ? "Método fechou negativo no turno - sem participação nas entradas"
                                    : undefined
                                }
                              >
                                {isNegative ? "—" : `${Math.round(share)}%`}
                              </span>
                            </div>
                            <div className="mt-[5px] h-[5px] overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-brand-500"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ações rápidas */}
                <div className="overflow-hidden rounded-[13px] border border-border bg-card">
                  <div className="border-b border-border px-4 py-3 text-[13px] font-extrabold text-foreground">
                    Registrar movimento
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3.5 sm:grid-cols-4">
                    {MOVEMENT_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        onClick={() => openMovementDialog(opt.value)}
                        className="rounded-[10px] border border-border bg-card px-2 py-2.5 text-center text-[12px] font-bold text-foreground transition-colors hover:bg-muted"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conferência de fechamento */}
              <div className="min-w-0 rounded-[13px] border border-border bg-card p-[14px] lg:sticky lg:top-[26px]">
                <div className="text-[13px] font-extrabold text-foreground">
                  Conferência de fechamento
                </div>
                <p className="mt-[3px] text-[11px] font-semibold text-muted-foreground">
                  Confira o dinheiro físico da gaveta
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Fundo de troco
                    </span>
                    <span className="font-bold">
                      {formatCurrency(registerOpeningBalance)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Movimento em dinheiro
                      <span className="mt-px block text-[10.5px] font-semibold text-muted-foreground">
                        Líquido do turno
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-bold",
                        netCash < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {formatSigned(netCash)}
                    </span>
                  </div>
                </div>

                <div className="my-3 h-px bg-muted" />

                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-extrabold">
                    Esperado na gaveta
                  </span>
                  <span className="text-[18px] font-extrabold tracking-tight">
                    {formatCurrency(expectedInDrawer)}
                  </span>
                </div>

                {/* Detalhamento: brutos por tipo de movimento, só pra o
                    operador enxergar o que compôs o turno. Não entram na
                    conta acima - somá-los de novo contaria a sangria duas
                    vezes, que era exatamente o bug da conferência. */}
                <div className="mt-3 rounded-[9px] bg-muted px-[11px] py-[9px]">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
                    Detalhamento do turno
                  </div>
                  <div className="mt-px text-[10.5px] font-semibold text-muted-foreground">
                    Brutos por tipo, já refletidos nos totais acima — não somar
                    de novo.
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-semibold text-muted-foreground">
                        Vendas (todos os métodos)
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {formatCurrency(summary?.totalSales ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-semibold text-muted-foreground">
                        Suprimentos
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {formatCurrency(summary?.totalDeposits ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-semibold text-muted-foreground">
                        Sangrias
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {formatCurrency(summary?.totalWithdrawals ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-semibold text-muted-foreground">
                        Reembolsos
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {formatCurrency(summary?.totalRefunds ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-[6px] mt-3 text-[11px] font-bold text-foreground">
                  Valor contado
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[11.5px] font-bold text-muted-foreground">
                    R$
                  </span>
                  <input
                    placeholder="0,00"
                    value={countedTotal}
                    onChange={(e) => setCountedTotal(e.target.value)}
                    className="h-[38px] w-full rounded-[9px] border border-border bg-card pl-[34px] pr-3 text-[13px] font-bold text-foreground outline-none"
                  />
                </div>

                {!hasContado && (
                  <div className="mt-[9px] rounded-[9px] bg-muted px-[11px] py-[9px] text-[11.5px] font-semibold text-muted-foreground">
                    Informe o valor contado para calcular a diferença.
                  </div>
                )}
                {difOk && (
                  <div className="mt-[9px] rounded-[9px] bg-emerald-50 dark:bg-emerald-950/40 px-[11px] py-[9px] text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                    ✓ Caixa conferido, sem diferença
                  </div>
                )}
                {difSobra && (
                  <div className="mt-[9px] rounded-[9px] bg-violet-50 dark:bg-violet-950/40 px-[11px] py-[9px] text-xs font-extrabold text-violet-700 dark:text-violet-400">
                    Sobra de {formatCurrency(Math.abs(difVal))}
                  </div>
                )}
                {difFalta && (
                  <div className="mt-[9px] rounded-[9px] bg-red-50 dark:bg-red-950/40 px-[11px] py-[9px] text-xs font-extrabold text-red-600 dark:text-red-400">
                    Falta de {formatCurrency(Math.abs(difVal))}
                  </div>
                )}

                <input
                  placeholder="Observações (opcional)"
                  value={closeObs}
                  onChange={(e) => setCloseObs(e.target.value)}
                  className={cn(fieldClass, "mt-2.5 bg-card")}
                />

                {confirmBeforeCloseRegister && (
                  <label className="mt-2.5 flex cursor-pointer items-start gap-2">
                    <Checkbox
                      checked={closeConfirmed}
                      onCheckedChange={(checked) =>
                        setCloseConfirmed(checked === true)
                      }
                      className="mt-0.5 h-4 w-4"
                    />
                    <span className="text-[11.5px] font-semibold text-foreground">
                      Confirmo que conferi o dinheiro físico da gaveta
                    </span>
                  </label>
                )}

                <Button
                  onClick={handleCloseRegister}
                  disabled={
                    closeMutation.isPending ||
                    (confirmBeforeCloseRegister && !closeConfirmed)
                  }
                  className="mt-3 h-10 w-full rounded-[10px] bg-zinc-900 text-[13px] font-extrabold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {closeMutation.isPending ? "Fechando..." : "Fechar caixa"}
                </Button>
              </div>
            </div>

            {/* Extrato de movimentos: os totais do resumo são líquidos e não
                dizem QUAL lançamento gerou a diferença - aqui o operador
                confere linha a linha. */}
            <div className="mt-3 overflow-hidden rounded-[13px] border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div>
                  <div className="text-[13px] font-extrabold text-foreground">
                    Extrato de movimentos
                  </div>
                  <div className="mt-px text-[11px] font-semibold text-muted-foreground">
                    Lançamentos deste caixa, para conferir uma diferença linha
                    a linha
                  </div>
                </div>
                <span className="shrink-0 rounded-[8px] border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground">
                  {movementsMeta?.total ?? 0} movimento
                  {(movementsMeta?.total ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-2 border-b border-border bg-muted px-4 py-3">
                <label className="min-w-[150px] flex-1 sm:max-w-[210px]">
                  <span className="mb-[6px] block text-[11px] font-bold text-foreground">
                    Tipo
                  </span>
                  <select
                    value={movementTypeFilter}
                    onChange={(e) =>
                      changeMovementType(
                        e.target.value as CashMovementType | "ALL",
                      )
                    }
                    className={cn(fieldClass, "bg-card")}
                  >
                    {MOVEMENT_TYPE_FILTERS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-[150px] flex-1 sm:max-w-[210px]">
                  <span className="mb-[6px] block text-[11px] font-bold text-foreground">
                    Método
                  </span>
                  <select
                    value={movementMethodFilter}
                    onChange={(e) =>
                      changeMovementMethod(
                        e.target.value as PaymentMethod | "ALL",
                      )
                    }
                    className={cn(fieldClass, "bg-card")}
                  >
                    {MOVEMENT_METHOD_FILTERS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                {hasMovementFilters && (
                  <CompactButton
                    onClick={clearMovementFilters}
                    className="bg-card"
                  >
                    Limpar filtros
                  </CompactButton>
                )}
              </div>

              {movementsLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-[9px]" />
                  ))}
                </div>
              ) : movementsError ? (
                <div className="py-9 text-center">
                  <div className="text-[13px] font-bold text-foreground">
                    Não foi possível carregar os movimentos
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    Use Atualizar para tentar de novo
                  </div>
                </div>
              ) : movements.length === 0 ? (
                <div className="py-9 text-center">
                  <div className="text-2xl">🧾</div>
                  <div className="mt-1.5 text-[13px] font-bold text-foreground">
                    Nenhum movimento encontrado
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {hasMovementFilters
                      ? "Tente ajustar os filtros"
                      : "Os lançamentos do turno aparecem aqui"}
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile: lista em cards */}
                  <div
                    className={cn(
                      "divide-y divide-border md:hidden",
                      movementsFetching && "opacity-60",
                    )}
                  >
                    {movements.map((movement) => {
                      const signed = movementSignedAmount(movement);
                      return (
                        <div key={movement.id} className="p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold",
                                MOVEMENT_TYPE_BADGE[movement.type] ??
                                  "bg-muted text-muted-foreground",
                              )}
                            >
                              {MOVEMENT_TYPE_LABELS[movement.type] ??
                                movement.type}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 text-[13px] font-extrabold",
                                signed < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-emerald-700 dark:text-emerald-400",
                              )}
                            >
                              {formatSigned(signed)}
                            </span>
                          </div>
                          <div className="mt-2 text-[12px] font-semibold text-foreground">
                            {movement.description || "—"}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
                            <span>
                              {movement.paymentMethod
                                ? PAYMENT_METHOD_LABELS[movement.paymentMethod]
                                : "—"}
                              {movement.source
                                ? ` · ${MOVEMENT_SOURCE_LABELS[movement.source]}`
                                : ""}
                            </span>
                            <span>
                              {formatDateTimeShort(movementDate(movement))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop/tablet: tabela */}
                  <div className="hidden overflow-x-auto md:block">
                    <div className="min-w-[760px]">
                      <div
                        className="grid items-center gap-2.5 border-b border-border bg-muted px-4 py-2.5"
                        style={{ gridTemplateColumns: MOVEMENTS_GRID }}
                      >
                        <span className={movementHeaderClass}>HORA</span>
                        <span className={movementHeaderClass}>TIPO</span>
                        <span className={movementHeaderClass}>DESCRIÇÃO</span>
                        <span className={movementHeaderClass}>MÉTODO</span>
                        <span className={movementHeaderClass}>ORIGEM</span>
                        <span
                          className={cn(movementHeaderClass, "text-right")}
                        >
                          VALOR
                        </span>
                      </div>

                      <div className={cn(movementsFetching && "opacity-60")}>
                        {movements.map((movement) => {
                          const signed = movementSignedAmount(movement);
                          return (
                            <div
                              key={movement.id}
                              className="grid items-center gap-2.5 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-muted"
                              style={{ gridTemplateColumns: MOVEMENTS_GRID }}
                            >
                              <span className="text-[11.5px] font-semibold text-muted-foreground">
                                {formatDateTimeShort(movementDate(movement))}
                              </span>
                              <span
                                className={cn(
                                  "w-fit rounded-md px-2 py-0.5 text-[10.5px] font-extrabold",
                                  MOVEMENT_TYPE_BADGE[movement.type] ??
                                    "bg-muted text-muted-foreground",
                                )}
                              >
                                {MOVEMENT_TYPE_LABELS[movement.type] ??
                                  movement.type}
                              </span>
                              <span
                                className="truncate text-[12px] font-semibold text-foreground"
                                title={movement.description || undefined}
                              >
                                {movement.description || "—"}
                              </span>
                              <span className="truncate text-[11.5px] font-semibold text-muted-foreground">
                                {movement.paymentMethod
                                  ? PAYMENT_METHOD_LABELS[
                                      movement.paymentMethod
                                    ]
                                  : "—"}
                              </span>
                              <span className="text-[11.5px] font-semibold text-muted-foreground">
                                {movement.source
                                  ? MOVEMENT_SOURCE_LABELS[movement.source]
                                  : "—"}
                              </span>
                              <span
                                className={cn(
                                  "text-right text-[12.5px] font-extrabold",
                                  signed < 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-emerald-700 dark:text-emerald-400",
                                )}
                              >
                                {formatSigned(signed)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {movementsTotalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
                  <span className="text-[11.5px] font-semibold text-muted-foreground">
                    Página {movementsMeta?.page ?? movementsPage} de{" "}
                    {movementsTotalPages} ({movementsMeta?.total ?? 0}{" "}
                    movimentos)
                  </span>
                  <div className="flex gap-1.5">
                    <CompactButton
                      onClick={() =>
                        setMovementsPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={movementsPage <= 1 || movementsFetching}
                    >
                      Anterior
                    </CompactButton>
                    <CompactButton
                      onClick={() =>
                        setMovementsPage((prev) =>
                          Math.min(prev + 1, movementsTotalPages),
                        )
                      }
                      disabled={
                        movementsPage >= movementsTotalPages ||
                        movementsFetching
                      }
                    >
                      Próxima
                    </CompactButton>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Banner de caixa fechado */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-muted px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px]">🔒</span>
                <span className="text-[13.5px] font-extrabold text-foreground">
                  Caixa Fechado
                </span>
              </div>
              <Button
                onClick={() => setDialog("open-register")}
                className="h-[34px] rounded-[9px] bg-brand-500 px-4 text-[12.5px] font-extrabold text-white shadow-[0_4px_12px_rgba(255,107,0,.25)] hover:bg-brand-600"
              >
                🔓 Abrir Caixa
              </Button>
            </div>
            <div className="rounded-[13px] border border-dashed border-border bg-card px-5 py-10 text-center">
              <div className="text-[26px]">💵</div>
              <div className="mt-2 text-[13.5px] font-bold text-foreground">
                Nenhum caixa aberto
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                Abra o caixa para registrar movimentos
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal: Abrir caixa */}
      <Dialog
        open={dialog === "open-register"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent
          hideClose
          className="max-w-[340px] gap-0 rounded-[15px] border-none p-[18px] shadow-2xl"
        >
          <ModalTitle onClose={closeDialog}>Abrir caixa</ModalTitle>

          <FieldLabel>Fundo de troco inicial</FieldLabel>
          <div className="relative mb-3">
            <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[11.5px] font-bold text-muted-foreground">
              R$
            </span>
            <input
              placeholder="0,00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="h-[38px] w-full rounded-[9px] border border-border bg-muted pl-[34px] pr-3 text-[13px] text-foreground outline-none"
            />
          </div>

          <FieldLabel>Observações (opcional)</FieldLabel>
          <input
            placeholder="Ex: Abertura turno manhã"
            value={openObs}
            onChange={(e) => setOpenObs(e.target.value)}
            className={cn(fieldClass, "mb-4 h-[38px]")}
          />

          <div className="flex gap-2">
            <CompactButton onClick={closeDialog} className="flex-1">
              Cancelar
            </CompactButton>
            <Button
              onClick={handleOpenRegister}
              disabled={openMutation.isPending || !openingBalance}
              className="h-9 flex-1 rounded-[9px] bg-brand-500 text-xs font-extrabold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {openMutation.isPending ? "Abrindo..." : "Abrir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar movimento */}
      <Dialog
        open={dialog === "movement"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent
          hideClose
          className="max-w-[380px] gap-0 rounded-[15px] border-none p-[18px] shadow-2xl"
        >
          <ModalTitle onClose={closeDialog}>Registrar movimento</ModalTitle>

          <FieldLabel>Tipo</FieldLabel>
          <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {MOVEMENT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                onClick={() => switchMovementType(opt.value)}
                className={cn(
                  "h-[30px] rounded-[8px] text-[11px] font-bold transition-colors",
                  movementType === opt.value
                    ? "bg-zinc-900 text-white"
                    : "bg-muted text-foreground hover:bg-muted",
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <FieldLabel>Método de pagamento *</FieldLabel>
          <select
            required
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(toPaymentMethod(e.target.value))}
            className={cn(
              fieldClass,
              "h-[38px] bg-muted",
              movementType === "withdrawal" ? "mb-1.5" : "mb-3",
            )}
          >
            <option value="" disabled>
              Selecione o método
            </option>
            {Object.values(PaymentMethod).map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          {movementType === "withdrawal" && (
            <p className="mb-3 text-[10.5px] leading-snug text-muted-foreground">
              A sangria não usa o método padrão: escolha de onde o dinheiro
              sai.
            </p>
          )}

          <FieldLabel>Descrição</FieldLabel>
          <input
            placeholder="Ex: Sangria, reforço…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mb-3 h-[38px] w-full rounded-[9px] border border-border bg-muted px-3 text-[13px] text-foreground outline-none"
          />

          <FieldLabel>Valor</FieldLabel>
          <div className="relative mb-4">
            <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[11.5px] font-bold text-muted-foreground">
              R$
            </span>
            <input
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-[38px] w-full rounded-[9px] border border-border bg-muted pl-[34px] pr-3 text-[13px] text-foreground outline-none"
            />
          </div>

          <div className="flex gap-2">
            <CompactButton onClick={closeDialog} className="flex-1">
              Cancelar
            </CompactButton>
            <Button
              onClick={handleConfirmMovement}
              disabled={
                isMovementPending ||
                !amount ||
                !description ||
                missingPaymentMethod
              }
              className="h-9 flex-1 rounded-[9px] bg-brand-500 text-xs font-extrabold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMovementPending ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}

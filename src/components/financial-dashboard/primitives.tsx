"use client";

/** Peças visuais compartilhadas pelas faixas do painel. Nenhuma delas busca
 *  dado: tudo chega por prop, vindo do use-financial-dashboard. */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export const cardClass =
  "rounded-[13px] border border-border bg-card px-4 py-[13px]";

export function BandTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-[13px] font-extrabold text-foreground">{children}</h2>
      {hint && (
        <span className="text-[11px] font-semibold text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}

export function BandSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:[grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-[13px]" />
      ))}
    </div>
  );
}

/** Percentual formatado com sinal; "—" quando não há base de comparação. */
export function DeltaBadge({
  value,
  unit = "percent",
  invert = false,
}: {
  value: number | null;
  /** `points` para variação de margem, que já é percentual. */
  unit?: "percent" | "points";
  /** Despesa subindo é ruim: inverte a cor sem inverter o sinal. */
  invert?: boolean;
}) {
  if (value === null) {
    return (
      <span
        className="text-[11px] font-bold text-muted-foreground"
        title="Sem base de comparação no período anterior"
      >
        —
      </span>
    );
  }

  const isUp = value > 0;
  const isFlat = Math.abs(value) < 0.0005;
  const good = invert ? !isUp : isUp;
  const formatted =
    unit === "points"
      ? `${isUp ? "+" : ""}${(value * 100).toFixed(1)} p.p.`
      : `${isUp ? "+" : ""}${(value * 100).toFixed(1)}%`;

  return (
    <span
      className={cn(
        "text-[11px] font-bold",
        isFlat ? "text-muted-foreground" : good ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
      )}
    >
      {formatted}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  delta,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={cn(cardClass, emphasis && "border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/40")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-muted-foreground">
          {label}
        </span>
        {delta}
      </div>
      <div
        className={cn(
          "mt-1.5 whitespace-nowrap font-extrabold tracking-tight text-foreground",
          emphasis ? "text-[26px]" : "text-[19px]",
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  );
}

/** Cartão que só navega. O painel mostra e leva; quem opera é a outra tela. */
export function LinkCard({
  href,
  icon,
  label,
  value,
  sub,
  action,
  alert = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub: ReactNode;
  action: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3.5 rounded-[13px] border px-4 py-[15px] transition-colors",
        alert
          ? "border-[#F1C9C3] bg-red-50 dark:bg-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/40"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px]",
          alert ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "bg-muted text-foreground",
        )}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-semibold text-muted-foreground">{label}</div>
        <div
          className={cn(
            "mt-0.5 truncate text-[17px] font-extrabold tracking-tight",
            alert ? "text-red-600 dark:text-red-400" : "text-foreground",
          )}
        >
          {value}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] font-semibold text-muted-foreground">
          {sub}
        </div>
      </div>

      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11.5px] font-bold text-muted-foreground transition-colors group-hover:text-foreground">
        {action}
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft, Bike } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  backHref?: string;
};

/**
 * Cabeçalho das telas do entregador. Sticky com folga pra safe-area: no
 * celular a barra do sistema come o topo, e o header é onde ficam as ações
 * que ele usa de capacete.
 */
export function ScreenHeader({ title, subtitle, actions, backHref }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Voltar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Bike className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold text-foreground">
              {title}
            </p>
            <p className="truncate text-[12px] font-semibold text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        )}
      </div>
    </header>
  );
}

/** Botão de ícone do header - alvo de 44px, que é o mínimo usável de moto. */
export function HeaderIconButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted ${
        danger
          ? "hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          : ""
      }`}
    >
      {children}
    </button>
  );
}

export function HeaderIconLink({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted"
    >
      {children}
    </Link>
  );
}

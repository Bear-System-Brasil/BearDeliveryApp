"use client";

import Link from "next/link";
import { ChevronRight, Home, LogOut } from "lucide-react";

import { ScreenHeader } from "@/components/delivery-dashboard/screen-header";
import { useAuth } from "@/contexts/auth-provider";
import { useAcceptConfirmation } from "@/hooks/use-accept-confirmation";

function SettingToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:bg-muted disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-[14.5px] font-bold text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${
          checked ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function DeliverySettingsPage() {
  const { logout } = useAuth();
  const { shouldConfirm, setSkipConfirm, isReady } = useAcceptConfirmation();

  return (
    <>
      <ScreenHeader title="Ajustes" subtitle="Preferências da área de entregas" />

      <main className="mx-auto max-w-md space-y-7 px-4 pt-4">
        <section className="space-y-2.5">
          <h2 className="px-1 text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Ao aceitar entregas
          </h2>
          <SettingToggle
            title="Pedir confirmação"
            description="Mostra um resumo da entrega antes de aceitar. Desligue para aceitar com um toque só."
            checked={shouldConfirm}
            disabled={!isReady}
            onChange={(value) => setSkipConfirm(!value)}
          />
        </section>

        <section className="space-y-2.5">
          <h2 className="px-1 text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Conta
          </h2>

          {/*
            A volta pro app do cliente. O caminho de volta pra cá já existe:
            `delivery` é role de staff, então a BottomBar do cliente mostra a
            aba "Entregas" apontando pra /delivery-dashboard (ver
            WORKSPACE_LINK_BY_ROLE) - o entregador também é cliente e pode
            usar o app normalmente.
          */}
          <Link
            href="/"
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4 transition hover:bg-muted"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <Home className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-bold text-foreground">
                  Ir para o app
                </span>
                <span className="mt-0.5 block text-[12.5px] font-medium text-muted-foreground">
                  Peça como cliente. Volte pela aba Entregas.
                </span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400">
              <LogOut className="h-5 w-5" />
            </span>
            <span className="text-[14.5px] font-bold text-red-500 dark:text-red-400">
              Sair da conta
            </span>
          </button>
        </section>
      </main>
    </>
  );
}

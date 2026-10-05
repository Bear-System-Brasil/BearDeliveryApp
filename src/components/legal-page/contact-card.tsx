"use client";

import { Check, Copy, Mail } from "lucide-react";
import { useEffect, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

/**
 * Contato da tela /legal. O `mailto:` sozinho não serve no PC sem app de
 * e-mail configurado (quem usa Gmail no navegador clica e nada acontece),
 * então o principal é copiar o endereço. O `mailto:` fica como opção.
 */
export function ContactCard({ email }: { email: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopyState("copied");
    } catch {
      // Sem permissão de área de transferência: o e-mail continua escrito
      // no card para a pessoa selecionar.
      setCopyState("failed");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Mail className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold">Fale com a gente</span>
          <span className="mt-0.5 block select-all break-words text-[13px] text-muted-foreground">
            {email}
          </span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={copyEmail}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-[14px] font-bold text-white transition hover:bg-brand-600"
        >
          {copyState === "copied" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copyState === "copied" ? "E-mail copiado" : "Copiar e-mail"}
        </button>
        {/* `mailto:` é link externo: <a>, não <Link>. */}
        <a
          href={`mailto:${email}`}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-[14px] font-semibold transition hover:bg-muted"
        >
          Abrir app de e-mail
        </a>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-2 text-[13px] text-muted-foreground"
      >
        {copyState === "failed"
          ? "Não foi possível copiar. Selecione o e-mail acima."
          : ""}
      </p>
    </div>
  );
}

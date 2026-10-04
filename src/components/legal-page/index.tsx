import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Casca das páginas legais (/privacy e /terms): texto longo, leitura no
 * celular, sem estado - por isso Server Component.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-foreground">
      <Link
        href="/"
        className="text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
      >
        ← Voltar para o início
      </Link>
      <h1 className="mt-4 text-[26px] font-extrabold leading-tight">{title}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Última atualização: {updatedAt}
      </p>
      <div className="mt-6 space-y-6 text-[15px] leading-relaxed">
        {children}
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[18px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

/** Dados de contato e responsáveis, iguais nas duas páginas. */
export const LEGAL_CONTACT_EMAIL = "beardeliveryofc@gmail.com";
export const LEGAL_RESPONSIBLES = "Kauan Alves Prata e Wesley da Silva Brum";
export const LEGAL_UPDATED_AT = "4 de outubro de 2026";

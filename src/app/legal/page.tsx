import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, Mail, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_UPDATED_AT,
  LegalPage,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Termos e privacidade",
  description: "Termos de uso, política de privacidade e contato do BearDelivery.",
};

function LinkRow({
  href,
  icon,
  title,
  description,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  external?: boolean;
}) {
  const className =
    "flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4 transition hover:bg-muted";
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold">{title}</span>
          <span className="mt-0.5 block break-words text-[13px] text-muted-foreground">
            {description}
          </span>
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </>
  );

  // `mailto:` é link externo: <a>, não <Link>.
  return external ? (
    <a href={href} className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

/**
 * Tela única com os documentos e o contato, aberta pelo menu lateral (o
 * rodapé saiu do app). Redes sociais e dúvidas frequentes entram aqui quando
 * existirem - ver LDMF-195 e LDMF-283.
 */
export default function LegalHubPage() {
  return (
    <LegalPage title="Termos e privacidade" updatedAt={LEGAL_UPDATED_AT}>
      <div className="space-y-3">
        <LinkRow
          href="/terms"
          icon={<FileText className="h-5 w-5" />}
          title="Termos de uso"
          description="As regras para usar o BearDelivery."
        />
        <LinkRow
          href="/privacy"
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Política de privacidade"
          description="Quais dados coletamos, para quê e seus direitos."
        />
        <LinkRow
          href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          icon={<Mail className="h-5 w-5" />}
          title="Fale com a gente"
          description={LEGAL_CONTACT_EMAIL}
          external
        />
      </div>
    </LegalPage>
  );
}

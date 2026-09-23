"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, History, Settings, type LucideIcon } from "lucide-react";

/**
 * Navegação da área de entregas.
 *
 * Só destinos da área de trabalho: a volta pro app do cliente fica em
 * Ajustes, porque é saída de contexto, não navegação entre telas de trabalho.
 *
 * A BottomBar do cliente se esconde nestas rotas (ver
 * constants/bottom-bar-routes), então as duas nunca aparecem juntas.
 */
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/delivery-dashboard", label: "Entregas", icon: Bike },
  { href: "/delivery-dashboard/historico", label: "Histórico", icon: History },
  { href: "/delivery-dashboard/ajustes", label: "Ajustes", icon: Settings },
];

/** Altura da barra, reaproveitada pelo padding do layout da área. */
export const DELIVERY_TAB_BAR_HEIGHT = "4.5rem";

export function DeliveryTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação de entregas"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          // Exato na raiz pra "Entregas" não ficar acesa nas subrotas.
          const isActive =
            tab.href === "/delivery-dashboard"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-[4.5rem] flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-brand-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? "scale-110" : ""}`} />
              <span
                className={`text-[11.5px] ${
                  isActive ? "font-extrabold" : "font-semibold"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BottomBar } from "@/components/ui/bottom-bar";
import { isBottomBarHidden } from "@/constants/bottom-bar-routes";
import { cn } from "@/lib/utils";

/**
 * Casca do app: reserva no rodapé exatamente a altura da barra de navegação -
 * e só quando ela existe.
 *
 * O padding era fixo no layout raiz enquanto o `BottomBar` se escondia
 * sozinho em algumas rotas, então nessas telas sobrava uma faixa vazia de
 * 4rem no fim da página. As duas decisões agora saem da mesma função.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasBottomBar = !isBottomBarHidden(pathname);

  return (
    <>
      <div
        className={cn(
          hasBottomBar && "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0",
        )}
      >
        {children}
      </div>
      <BottomBar />
    </>
  );
}

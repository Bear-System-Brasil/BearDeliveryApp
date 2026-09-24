"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

/**
 * Tema escuro desligado a pedido do produto, temporariamente: o app fica
 * sempre claro e o seletor de tema some do menu.
 *
 * Para reativar, basta trocar para `false` - nada mais precisa mudar: as
 * variáveis `.dark { ... }` de globals.css e as classes `dark:` dos
 * componentes continuam no lugar.
 */
export const THEME_LOCKED_TO_LIGHT = true;

/**
 * `attribute="class"` casa com `darkMode: "class"` do tailwind.config.ts e
 * com as variáveis `.dark { ... }` já definidas em globals.css - essa parte
 * da infra já existia, só nunca tinha sido ligada a um provider de verdade.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={THEME_LOCKED_TO_LIGHT ? "light" : "system"}
      enableSystem={!THEME_LOCKED_TO_LIGHT}
      // `forcedTheme` ignora o que estiver salvo no localStorage de quem já
      // tinha escolhido escuro, sem precisar limpar nada.
      forcedTheme={THEME_LOCKED_TO_LIGHT ? "light" : undefined}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

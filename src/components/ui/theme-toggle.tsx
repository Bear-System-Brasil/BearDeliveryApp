"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { THEME_LOCKED_TO_LIGHT } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const CYCLE = ["light", "dark", "system"] as const;

const ICON_BY_THEME = {
  light: Sun,
  dark: Moon,
  system: SunMoon,
} as const;

const LABEL_BY_THEME = {
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
} as const;

/**
 * Alterna claro → escuro → automático (sistema) → claro num único botão.
 * `next-themes` só resolve o tema real no client (evita mismatch de SSR),
 * então o ícone fica num estado neutro até montar.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Tema travado no claro: o botão não teria o que alternar.
  if (THEME_LOCKED_TO_LIGHT) return null;

  const current = mounted
    ? (CYCLE.find((t) => t === theme) ?? "system")
    : "system";
  const Icon = ICON_BY_THEME[current];

  const handleClick = () => {
    const currentIndex = CYCLE.indexOf(current);
    const next = CYCLE[(currentIndex + 1) % CYCLE.length];
    setTheme(next);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleClick}
      className={cn("rounded-xl border-0 bg-muted", className)}
      aria-label={`${LABEL_BY_THEME[current]} - trocar tema`}
      title={LABEL_BY_THEME[current]}
    >
      {mounted ? <Icon className="h-4 w-4" /> : <SunMoon className="h-4 w-4" />}
    </Button>
  );
}

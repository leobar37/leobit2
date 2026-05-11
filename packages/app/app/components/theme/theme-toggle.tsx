import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useTheme } from "./theme-provider";
import type { ThemeMode } from "./theme-storage";

const THEME_LABELS: Record<ThemeMode, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

const THEME_MODE_ORDER: ThemeMode[] = ["system", "light", "dark"];

export function ThemeToggle() {
  const { mode, resolvedTheme, cycleMode } = useTheme();

  const currentIndex = THEME_MODE_ORDER.indexOf(mode);
  const nextMode = THEME_MODE_ORDER[(currentIndex + 1) % THEME_MODE_ORDER.length];
  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-testid="theme-toggle"
      aria-label="Cambiar tema"
      title={`Tema: ${THEME_LABELS[mode]}. Siguiente: ${THEME_LABELS[nextMode]}`}
      className="h-9 w-9 rounded-lg shell-toolbar-button text-muted-foreground hover:text-foreground"
      onClick={cycleMode}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">Tema actual: {THEME_LABELS[mode]}</span>
    </Button>
  );
}

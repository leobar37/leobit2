import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  THEME_MEDIA_QUERY,
  applyResolvedTheme,
  getInitialResolvedTheme,
  getInitialThemeMode,
  persistThemeMode,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "./theme-storage";

const THEME_MODE_ORDER: ThemeMode[] = ["system", "light", "dark"];

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getInitialResolvedTheme());

  useEffect(() => {
    persistThemeMode(mode);

    const nextResolvedTheme = resolveTheme(mode);
    applyResolvedTheme(nextResolvedTheme);
    setResolvedTheme(nextResolvedTheme);
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(THEME_MEDIA_QUERY);

    const handleChange = () => {
      if (mode !== "system") {
        return;
      }

      const nextResolvedTheme = mediaQueryList.matches ? "dark" : "light";
      applyResolvedTheme(nextResolvedTheme);
      setResolvedTheme(nextResolvedTheme);
    };

    handleChange();

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);
      return () => mediaQueryList.removeEventListener("change", handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      mode,
      resolvedTheme,
      setMode,
      cycleMode: () => {
        const currentIndex = THEME_MODE_ORDER.indexOf(mode);
        const nextIndex = (currentIndex + 1) % THEME_MODE_ORDER.length;
        setMode(THEME_MODE_ORDER[nextIndex]);
      },
    };
  }, [mode, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

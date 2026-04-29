export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "avileo-theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
export const DEFAULT_THEME_MODE: ThemeMode = "system";
export const FALLBACK_THEME: ResolvedTheme = "light";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function readStoredThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(value) ? value : null;
  } catch {
    return null;
  }
}

export function persistThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep the current session theme.
  }
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return FALLBACK_THEME;
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "dark") {
    return "dark";
  }

  if (mode === "light") {
    return "light";
  }

  return getSystemTheme();
}

export function applyResolvedTheme(resolvedTheme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.setAttribute("data-theme", resolvedTheme);
  root.style.colorScheme = resolvedTheme;
}

export function getInitialThemeMode(): ThemeMode {
  return readStoredThemeMode() ?? DEFAULT_THEME_MODE;
}

export function getInitialResolvedTheme(): ResolvedTheme {
  return resolveTheme(getInitialThemeMode());
}

export function createThemeScript() {
  return `(function(){try{var storageKey=${JSON.stringify(THEME_STORAGE_KEY)};var mediaQuery=${JSON.stringify(THEME_MEDIA_QUERY)};var fallback=${JSON.stringify(FALLBACK_THEME)};var stored=localStorage.getItem(storageKey);var mode=stored==="light"||stored==="dark"||stored==="system"?stored:"system";var resolved=mode==="dark"?"dark":mode==="light"?"light":window.matchMedia&&window.matchMedia(mediaQuery).matches?"dark":fallback;var root=document.documentElement;root.classList.toggle("dark",resolved==="dark");root.setAttribute("data-theme",resolved);root.style.colorScheme=resolved;}catch(error){var root=document.documentElement;root.classList.remove("dark");root.setAttribute("data-theme",${JSON.stringify(FALLBACK_THEME)});root.style.colorScheme=${JSON.stringify(FALLBACK_THEME)};}})();`;
}

export const themeScript = createThemeScript();

import { useMemo } from "react";
import {
  type BusinessModeFlags,
  getDefaultFlags,
  mergeBusinessModeFlags,
} from "@avileo/shared";
import { useBusiness } from "~/hooks/use-business";

export interface UseBusinessModeReturn {
  /** Current business mode slug, e.g. 'polleria' | 'agua' */
  mode: string;
  /** Merged flags (defaults + DB overrides) for the current mode */
  flags: BusinessModeFlags;
  /** Shorthand checkers for known modes */
  is: Record<string, boolean>;
  /** Check if a specific flag is enabled */
  hasFlag: (flag: keyof BusinessModeFlags) => boolean;
  /** Check if current mode matches */
  isMode: (...modes: string[]) => boolean;
}

/**
 * Hook that exposes the current business mode and its resolved flags.
 * Defaults to 'polleria' when no mode is set (backward compatible).
 */
export function useBusinessMode(): UseBusinessModeReturn {
  const { data: business, isLoading } = useBusiness();

  const mode = business?.businessMode ?? "polleria";

  const flags = useMemo(() => {
    if (isLoading || !business) {
      return getDefaultFlags("polleria");
    }

    const defaults = getDefaultFlags(mode);
    const overrides = business.modeConfigOverrides ?? {};

    return mergeBusinessModeFlags(defaults, overrides);
  }, [business, isLoading, mode]);

  const is = useMemo(() => {
    return {
      polleria: mode === "polleria",
      agua: mode === "agua",
      cochera: mode === "cochera",
    };
  }, [mode]);

  const hasFlag = (flag: keyof BusinessModeFlags): boolean => {
    const value = flags[flag];
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  };

  const isMode = (...modes: string[]): boolean => modes.includes(mode);

  return {
    mode,
    flags,
    is,
    hasFlag,
    isMode,
  };
}

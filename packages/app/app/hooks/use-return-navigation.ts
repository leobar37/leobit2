import { useMemo } from "react";
import { useSearchParams } from "react-router";

/**
 * Configuration for return navigation based on URL search params.
 * Maps a search param key to its corresponding return path.
 */
interface ReturnNavigationConfig {
  /** Map of search param key -> return path */
  [paramKey: string]: string;
}

/**
 * Default return path when no matching param is found */
interface UseReturnNavigationOptions {
  /** The configuration of param keys to return paths */
  config: ReturnNavigationConfig;
  /** Default path when no params match */
  defaultPath: string;
  /** Optional override: if provided and matches a config key, use its path regardless of URL param */
  overrideKey?: string;
}

/**
 * Reusable hook for determining return navigation based on URL search params.
 *
 * @example
 * ```tsx
 * const { returnTo } = useReturnNavigation({
 *   config: {
 *     visitaId: "/visitas",
 *     customerId: "/clientes",
 *     distribucionId: "/distribuciones",
 *   },
 *   defaultPath: "/ventas"
 * });
 *
 * // When URL is /ventas/123/editar?visitaId=abc
 * // returnTo will be "/visitas"
 * ```
 */
export function useReturnNavigation({ config, defaultPath, overrideKey }: UseReturnNavigationOptions) {
  const [searchParams] = useSearchParams();

  const returnTo = useMemo(() => {
    // If overrideKey is provided and exists in config, use it (priority over URL)
    if (overrideKey && config[overrideKey]) {
      return config[overrideKey];
    }

    // Check each configured param in order
    for (const [paramKey, path] of Object.entries(config)) {
      const paramValue = searchParams.get(paramKey);
      if (paramValue) {
        return path;
      }
    }
    // Fall back to default if no params match
    return defaultPath;
  }, [searchParams, config, defaultPath, overrideKey]);

  return { returnTo };
}

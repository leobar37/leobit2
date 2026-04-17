import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { getReturnUrl, isInternalUrl } from "~/lib/navigation/return-url";

interface ReturnNavigationConfig {
  [paramKey: string]: string;
}

interface UseReturnNavigationOptions {
  config: ReturnNavigationConfig;
  defaultPath: string;
  overrideKey?: string;
}

export function useReturnNavigation({ config, defaultPath, overrideKey }: UseReturnNavigationOptions) {
  const [searchParams] = useSearchParams();

  const returnTo = useMemo(() => {
    const urlReturn = getReturnUrl(searchParams);
    if (urlReturn && isInternalUrl(urlReturn)) {
      return urlReturn;
    }

    if (overrideKey && config[overrideKey]) {
      return config[overrideKey];
    }

    for (const [paramKey, path] of Object.entries(config)) {
      const paramValue = searchParams.get(paramKey);
      if (paramValue) {
        return path;
      }
    }
    return defaultPath;
  }, [searchParams, config, defaultPath, overrideKey]);

  return { returnTo };
}

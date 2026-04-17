import { useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
import { buildUrlWithReturn, getReturnUrl, isInternalUrl } from "~/lib/navigation/return-url";

interface UseReturnUrlResult {
  buildDetailUrl: (detailPath: string) => string;
  goBack: (fallbackPath: string) => void;
  returnUrl: string | null;
  hasSafeReturn: boolean;
}

export function useReturnUrl(): UseReturnUrlResult {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const returnUrl = useMemo(() => {
    const raw = getReturnUrl(searchParams);
    if (!raw) return null;
    return isInternalUrl(raw) ? raw : null;
  }, [searchParams]);

  const buildDetailUrl = useCallback(
    (detailPath: string): string => {
      return buildUrlWithReturn(detailPath, {
        pathname: location.pathname,
        search: location.search,
      });
    },
    [location.pathname, location.search]
  );

  const goBack = useCallback(
    (fallbackPath: string) => {
      const target = returnUrl && isInternalUrl(returnUrl) ? returnUrl : fallbackPath;
      navigate(target);
    },
    [navigate, returnUrl]
  );

  return {
    buildDetailUrl,
    goBack,
    returnUrl,
    hasSafeReturn: !!returnUrl,
  };
}

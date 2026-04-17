const RETURN_URL_PARAM = "returnUrl";

export function buildUrlWithReturn(
  targetPath: string,
  currentLocation: { pathname: string; search: string }
): string {
  const fullCurrentUrl = `${currentLocation.pathname}${currentLocation.search}`;
  const encodedReturnUrl = encodeURIComponent(fullCurrentUrl);
  const separator = targetPath.includes("?") ? "&" : "?";
  return `${targetPath}${separator}${RETURN_URL_PARAM}=${encodedReturnUrl}`;
}

export function getReturnUrl(searchParams: URLSearchParams): string | null {
  const encoded = searchParams.get(RETURN_URL_PARAM);
  if (!encoded) return null;

  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export function getSafeReturnUrl(
  searchParams: URLSearchParams,
  fallback: string
): string {
  const url = getReturnUrl(searchParams);
  if (!url) return fallback;
  return isInternalUrl(url) ? url : fallback;
}

export function isInternalUrl(url: string): boolean {
  if (!url.startsWith("/")) return false;
  if (/^(javascript|data|vbscript|file):/i.test(url)) return false;
  return true;
}

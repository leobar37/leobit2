const AUTH_TOKEN_KEY = "bearer_token";
const CURRENT_BUSINESS_ID_KEY = "current_business_id";

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getStoredAuthToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredBusinessId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(CURRENT_BUSINESS_ID_KEY);
}

export function setStoredBusinessId(businessId: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(CURRENT_BUSINESS_ID_KEY, businessId);
}

export function clearStoredBusinessId() {
  if (!canUseStorage()) return;
  localStorage.removeItem(CURRENT_BUSINESS_ID_KEY);
}

export function clearStoredAuthState() {
  if (!canUseStorage()) return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(CURRENT_BUSINESS_ID_KEY);
}

export const PERSISTED_REMOTE_QUERY_PREFIX = "persisted-remote" as const;

export type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown>;
export type QueryKey = readonly QueryKeyPart[];

export function withPersistedRemotePrefix<T extends readonly QueryKeyPart[]>(
  queryKey: T
): readonly [typeof PERSISTED_REMOTE_QUERY_PREFIX, ...T] {
  return [PERSISTED_REMOTE_QUERY_PREFIX, ...queryKey] as const;
}

export function isPersistedRemoteQueryKey(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === PERSISTED_REMOTE_QUERY_PREFIX;
}

export const PERSISTED_REMOTE_QUERY_KEYS = {
  authSession: withPersistedRemotePrefix(["auth", "session"] as const),
  business: withPersistedRemotePrefix(["business"] as const),
  team: withPersistedRemotePrefix(["team"] as const),
  businessCalculatorSettings: withPersistedRemotePrefix(
    ["business", "calculator-settings"] as const
  ),
  puntosVenta: withPersistedRemotePrefix(["puntos-venta"] as const),
  puntosVentaActive: withPersistedRemotePrefix(["puntos-venta", "active"] as const),
  puntoVenta: (id: string) => withPersistedRemotePrefix(["puntos-venta", id] as const),
  paymentMethodsConfig: withPersistedRemotePrefix(["payment-methods-config"] as const),
  cocheraSettings: withPersistedRemotePrefix(["cochera", "settings"] as const),
  cocheraSessions: withPersistedRemotePrefix(["cochera", "sessions"] as const),
  cocheraDashboard: withPersistedRemotePrefix(["cochera", "dashboard"] as const),
  cocheraReports: withPersistedRemotePrefix(["cochera", "reports"] as const),
  subscriptionStatus: withPersistedRemotePrefix(["subscription", "status"] as const),
} as const;

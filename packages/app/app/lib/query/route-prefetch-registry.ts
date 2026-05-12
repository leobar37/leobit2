import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Business } from "@avileo/shared";
import {
  accountsReceivableQueryOptions,
  totalAccountsReceivableQueryOptions,
} from "~/hooks/use-accounts-receivable";
import {
  customersQueryOptions,
  paginatedCustomersQueryOptions,
} from "~/hooks/use-customers";
import {
  miDistribucionQueryOptions,
  type DistribucionWithItems,
} from "~/hooks/use-distribuciones";
import { customerGroupsQueryOptions } from "~/hooks/use-grupos";
import { visitasQueryOptions } from "~/hooks/use-visitas";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";
import {
  DEFAULT_ACCOUNTS_RECEIVABLE_PREFETCH_FILTERS,
  DEFAULT_ACCOUNTS_RECEIVABLE_TOTAL_PREFETCH_FILTERS,
  DEFAULT_CUSTOMERS_PREFETCH_QUERY,
} from "~/lib/query/prefetch-defaults";

export type RoutePrefetchQuery = {
  queryKey: QueryKey;
  staleTime?: unknown;
} & Record<string, unknown>;

export interface RoutePrefetchContext {
  business?: Business | null;
  distribucionId?: string | null;
}

export function getCachedMiDistribucionId(
  queryClient: QueryClient,
  context: RoutePrefetchContext
): string | null {
  const vendedorId = context.business?.businessUserId;
  if (!vendedorId) return null;

  const distribucion = queryClient.getQueryData<DistribucionWithItems | null>(
    PERSISTED_REMOTE_QUERY_KEYS.distribuciones.mine(vendedorId, undefined)
  );

  return distribucion?.id ?? null;
}

export function getLikelyPrefetchRoutes(pathname: string, context: RoutePrefetchContext): string[] {
  if (pathname !== "/dashboard") {
    return [];
  }

  if (context.business?.businessMode === "cochera") {
    return [];
  }

  return ["/clientes", "/cobros", "/visitas"];
}

export function getRoutePrefetchQueries(
  route: string,
  context: RoutePrefetchContext
): RoutePrefetchQuery[] {
  switch (route) {
    case "/clientes":
      if (context.business?.businessMode === "cochera") return [];
      return [paginatedCustomersQueryOptions(DEFAULT_CUSTOMERS_PREFETCH_QUERY)];
    case "/cobros":
      if (context.business?.businessMode === "cochera") return [];
      return [
        accountsReceivableQueryOptions(DEFAULT_ACCOUNTS_RECEIVABLE_PREFETCH_FILTERS),
        totalAccountsReceivableQueryOptions(DEFAULT_ACCOUNTS_RECEIVABLE_TOTAL_PREFETCH_FILTERS),
      ];
    case "/visitas":
      return [
        miDistribucionQueryOptions(context.business?.businessUserId),
        customersQueryOptions(),
        customerGroupsQueryOptions(),
        ...(context.distribucionId ? [visitasQueryOptions(context.distribucionId)] : []),
      ];
    default:
      return [];
  }
}

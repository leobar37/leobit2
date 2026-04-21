/**
 * Engine-backed React hooks (Wave 4 POC)
 *
 * Typed hooks that consume SyncClientEngine directly via useSyncEngine().
 * These serve as the pattern for generated hooks in the next iteration.
 *
 * Usage:
 *   const { data: customers } = useEngineCustomers();
 *   const { mutate } = useEngineCreateCustomer();
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "~/lib/sync/engine-provider";
import type { Customer } from "@avileo/shared";

// =============================================================================
// Customer hooks
// =============================================================================

export function useEngineCustomers() {
  const engine = useSyncEngine();
  return useQuery({
    queryKey: ["customers", "engine"],
    queryFn: async () => {
      const service = engine.getService<{ findByBusiness: (filters?: Record<string, unknown>) => Promise<Customer[]> }>("customers");
      return service.findByBusiness();
    },
  });
}

export function useEngineCustomer(id: string) {
  const engine = useSyncEngine();
  return useQuery({
    queryKey: ["customers", "engine", id],
    queryFn: async () => {
      const service = engine.getService<{ findById: (id: string) => Promise<Customer | null> }>("customers");
      return service.findById(id);
    },
    enabled: !!id,
  });
}

export function useEngineCreateCustomer() {
  const engine = useSyncEngine();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const service = engine.getService<{ create: (input: Record<string, unknown>) => Promise<Customer> }>("customers");
      return service.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", "engine"] });
    },
  });
}

// =============================================================================
// Sale hooks
// =============================================================================

export function useEngineSales() {
  const engine = useSyncEngine();
  return useQuery({
    queryKey: ["sales", "engine"],
    queryFn: async () => {
      const service = engine.getService<{ findByBusiness: () => Promise<unknown[]> }>("sales");
      return service.findByBusiness();
    },
  });
}

// =============================================================================
// Generic engine service hook
// =============================================================================

/**
 * Generic hook to access any engine-registered service.
 * Prefer the typed hooks above; this is an escape hatch.
 */
export function useEngineService<T>(name: string): T {
  const engine = useSyncEngine();
  return engine.getService<T>(name);
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CocheraCustomerListResult,
  CocheraCustomerVehicle,
  CreateCocheraCustomerInput,
  CreateCocheraCustomerVehicleInput,
  UpdateCocheraCustomerVehicleInput,
} from "@avileo/shared";
import { api, extractData } from "~/lib/api-client";
import { PERSISTED_REMOTE_QUERY_KEYS, withPersistedRemotePrefix } from "~/lib/query/persisted-query-keys";
import { queryKeys } from "~/lib/query-keys";

const COCHERA_CUSTOMERS_KEY = withPersistedRemotePrefix(["cochera", "customers"] as const);

export function useCocheraCustomers(filters: { search?: string } = {}) {
  return useQuery({
    queryKey: [...COCHERA_CUSTOMERS_KEY, filters],
    queryFn: async (): Promise<CocheraCustomerListResult> => {
      const response = await api.cochera.customers.get({
        query: {
          search: filters.search || undefined,
        },
      });
      return extractData<CocheraCustomerListResult>(
        response,
        "No se pudo cargar clientes de cochera"
      );
    },
  });
}

export function useCreateCocheraCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCocheraCustomerInput) => {
      const response = await api.cochera.customers.post(input);
      return extractData<{
        customer: {
          id: string;
          name: string;
          phone: string | null;
          dni: string | null;
        };
        vehicles: CocheraCustomerVehicle[];
      }>(response, "No se pudo crear el cliente");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COCHERA_CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function useCreateCocheraCustomerVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      input,
    }: {
      customerId: string;
      input: CreateCocheraCustomerVehicleInput;
    }) => {
      const response = await api.cochera.customers({ id: customerId }).vehicles.post(input);
      return extractData<CocheraCustomerVehicle>(response, "No se pudo crear el vehículo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COCHERA_CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.cocheraDebts });
    },
  });
}

export function useUpdateCocheraCustomerVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vehicleId,
      input,
    }: {
      vehicleId: string;
      input: UpdateCocheraCustomerVehicleInput;
    }) => {
      const response = await api.cochera.customers.vehicles({ vehicleId }).patch(input);
      return extractData<CocheraCustomerVehicle>(response, "No se pudo actualizar el vehículo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COCHERA_CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.cocheraDebts });
    },
  });
}

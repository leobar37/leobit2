import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CocheraDebtListResult,
  CocheraSessionPaymentResult,
  CreateCocheraSessionPaymentInput,
} from "@avileo/shared";
import { api, extractData } from "~/lib/api-client";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

const COCHERA_DEBTS_KEY = PERSISTED_REMOTE_QUERY_KEYS.cocheraDebts;

export function useCocheraDebts(filters: { search?: string } = {}) {
  return useQuery({
    queryKey: [...COCHERA_DEBTS_KEY, filters],
    queryFn: async (): Promise<CocheraDebtListResult> => {
      const response = await api.cochera.debts.get({
        query: {
          search: filters.search || undefined,
        },
      });
      return extractData<CocheraDebtListResult>(response, "No se pudo cargar deudas de cochera");
    },
  });
}

export function useCreateCocheraDebtPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: CreateCocheraSessionPaymentInput;
    }): Promise<CocheraSessionPaymentResult> => {
      const response = await api.cochera.sessions({ id: sessionId }).payments.post(input);
      return extractData<CocheraSessionPaymentResult>(
        response,
        "No se pudo registrar el pago"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COCHERA_DEBTS_KEY });
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.cocheraReports });
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.cocheraDashboard });
      queryClient.invalidateQueries({ queryKey: PERSISTED_REMOTE_QUERY_KEYS.cocheraSessions });
    },
  });
}

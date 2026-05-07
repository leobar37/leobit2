import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import type { CocheraCheckoutInput, CocheraCheckoutResult } from "@avileo/shared";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

const COCHERA_SESSIONS_KEY = PERSISTED_REMOTE_QUERY_KEYS.cocheraSessions;

async function checkoutCocheraSession(
  id: string,
  input: CocheraCheckoutInput
): Promise<CocheraCheckoutResult> {
  const response = await api.cochera.sessions({ id }).checkout.post(input);
  return extractData(response, "Failed to checkout session");
}

export function useCocheraCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CocheraCheckoutInput }) =>
      checkoutCocheraSession(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COCHERA_SESSIONS_KEY });
    },
  });
}

import { useMutation, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { isOnline } from "~/lib/is-online";

export interface OfflineAwareMutationOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn"> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  offlineMessage?: string;
  onOffline?: () => void;
}

/**
 * Wrapper around useMutation that checks for internet connection before executing.
 * Shows a toast notification if the user tries to use the mutation while offline.
 *
 * @example
 * const mutation = useOfflineAwareMutation({
 *   mutationFn: sendWhatsAppMessage,
 *   offlineMessage: "Se requiere conexión a internet para enviar mensajes de WhatsApp",
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: ["messages"] });
 *   },
 * });
 */
export function useOfflineAwareMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: OfflineAwareMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { mutationFn, offlineMessage, onOffline, ...restOptions } = options;

  const wrappedMutationFn = async (variables: TVariables): Promise<TData> => {
    const online = isOnline();

    if (!online) {
      const message = offlineMessage ?? "Se requiere conexión a internet para realizar esta acción";
      toast.error(message);
      onOffline?.();
      throw new Error("Offline: No internet connection");
    }
    return mutationFn(variables);
  };

  return useMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    mutationFn: wrappedMutationFn,
  });
}

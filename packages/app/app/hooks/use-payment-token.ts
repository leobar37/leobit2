import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "~/lib/api-client";
import { extractData, getErrorMessage } from "~/lib/api-utils";

interface PaymentToken {
  id: string;
  paymentId: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
}

export function usePaymentToken(paymentId: string | null) {
  return useQuery({
    queryKey: ["payment-token", paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      const response = await api.payments({ id: paymentId }).token.get();
      if (response.error) {
        throw new Error(getErrorMessage(response.error.value));
      }
      return (response.data?.data ?? null) as PaymentToken | null;
    },
    enabled: !!paymentId,
  });
}

export function useGeneratePaymentToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await api.payments({ id: paymentId }).token.post();
      return extractData<{ token: string }>(response);
    },
    onSuccess: (_, paymentId) => {
      queryClient.invalidateQueries({ queryKey: ["payment-token", paymentId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error) || "No se pudo generar el enlace");
    },
  });
}

export function useRegeneratePaymentToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await api.payments({ id: paymentId }).token.regenerate.post();
      return extractData<{ token: string }>(response);
    },
    onSuccess: (_, paymentId) => {
      queryClient.invalidateQueries({ queryKey: ["payment-token", paymentId] });
      toast.success("Enlace regenerado");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error) || "No se pudo regenerar el enlace");
    },
  });
}

export function useTogglePaymentToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      isActive,
    }: {
      paymentId: string;
      isActive: boolean;
    }) => {
      const response = await api.payments({ id: paymentId }).token.toggle.post({ isActive });
      return extractData<PaymentToken>(response);
    },
    onSuccess: (_, { paymentId, isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["payment-token", paymentId] });
      toast.success(isActive ? "Enlace activado" : "Enlace desactivado");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error) || "No se pudo cambiar el estado del enlace");
    },
  });
}

export function useSharePayment() {
  const buildDetailUrl = (slug: string, token: string): string => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/pago/${slug}/detalle?token=${token}`;
  };

  const buildMessage = (url: string, amount: string): string => {
    return `Hola. Te comparto la confirmación de tu pago por S/ ${amount}:\n\n${url}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const shareNative = async (data: { title: string; text: string; url: string }) => {
    if (!navigator.share) {
      toast.error("Tu navegador no soporta compartir nativo");
      return;
    }

    try {
      await navigator.share(data);
    } catch {
      // User cancelled
    }
  };

  const shareWhatsApp = (message: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return {
    buildDetailUrl,
    buildMessage,
    copyToClipboard,
    shareNative,
    shareWhatsApp,
  };
}

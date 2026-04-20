/**
 * Hooks for sale token management
 * Generate, regenerate, toggle, and share sale tokens
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useToast } from "@/hooks/use-toast";

// Types
interface SaleToken {
  id: string;
  saleId: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

/**
 * Extract error message from structured API error
 */
function extractErrorMessage(errorValue: unknown): string {
  if (typeof errorValue === "string") {
    return errorValue;
  }
  if (errorValue && typeof errorValue === "object") {
    if ("message" in errorValue && typeof errorValue.message === "string") {
      return errorValue.message;
    }
    return JSON.stringify(errorValue);
  }
  return "Error desconocido";
}

// Get token for a sale
export function useSaleToken(saleId: string | null) {
  return useQuery({
    queryKey: ["sale-token", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const response = await api.sales({ id: saleId }).token.get();
      if (response.error) {
        throw new Error(extractErrorMessage(response.error.value));
      }
      return response.data?.data as SaleToken | null;
    },
    enabled: !!saleId,
  });
}

// Generate new token
export function useGenerateSaleToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const response = await api.sales({ id: saleId }).token.post();
      if (response.error) {
        throw new Error(extractErrorMessage(response.error.value));
      }
      return response.data?.data as { token: string };
    },
    onSuccess: (_, saleId) => {
      queryClient.invalidateQueries({ queryKey: ["sale-token", saleId] });
      toast.success("Token generado", {
        description: "El enlace para compartir está listo",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo generar el token",
      });
    },
  });
}

// Regenerate token (invalidates old one)
export function useRegenerateSaleToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const response = await api.sales({ id: saleId })["token"].regenerate.post();
      if (response.error) {
        throw new Error(extractErrorMessage(response.error.value));
      }
      return response.data?.data as { token: string };
    },
    onSuccess: (_, saleId) => {
      queryClient.invalidateQueries({ queryKey: ["sale-token", saleId] });
      toast.success("Token regenerado", {
        description: "El enlace anterior ya no funciona",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo regenerar el token",
      });
    },
  });
}

// Toggle token status (activate/deactivate)
export function useToggleSaleToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ saleId, isActive }: { saleId: string; isActive: boolean }) => {
      const response = await api.sales({ id: saleId })["token"].toggle.post({ isActive });
      if (response.error) {
        throw new Error(extractErrorMessage(response.error.value));
      }
      return response.data?.data as unknown as SaleToken;
    },
    onSuccess: (data, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ["sale-token", saleId] });
      toast.success(data.isActive ? "Token activado" : "Token desactivado", {
        description: data.isActive
          ? "El cliente puede editar la venta"
          : "El cliente ya no puede editar la venta",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo cambiar el estado del token",
      });
    },
  });
}

// Build share URL
export function useBuildSaleShareUrl() {
  return (token: string): string => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/venta/${token}`;
  };
}

// Build WhatsApp message
export function useBuildWhatsAppMessage() {
  return (url: string, saleId: string): string => {
    return `Hola! Te comparto el enlace para revisar tu pedido:\n\n${url}\n\nPuedes modificar los productos mientras esté en borrador.`;
  };
}

// Share via WhatsApp
export function useShareViaWhatsApp() {
  return (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };
}

// Share natively (Web Share API)
export function useShareNative() {
  const { toast } = useToast();

  return async (data: { title: string; text: string; url: string }) => {
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        // User cancelled or error - ignore silently
      }
    } else {
      toast.warning("No soportado", {
        description: "Tu navegador no soporta compartir nativo",
      });
    }
  };
}

// Copy to clipboard
export function useCopyToClipboard() {
  const { toast } = useToast();

  return async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado", {
        description: "Enlace copiado al portapapeles",
      });
    } catch (error) {
      toast.error("Error", {
        description: "No se pudo copiar el enlace",
      });
    }
  };
}

// Combined hook for sharing
export function useShareSale() {
  const buildUrl = useBuildSaleShareUrl();
  const buildMessage = useBuildWhatsAppMessage();
  const shareWhatsApp = useShareViaWhatsApp();
  const shareNative = useShareNative();
  const copyToClipboard = useCopyToClipboard();

  return {
    buildUrl,
    buildMessage,
    shareWhatsApp,
    shareNative,
    copyToClipboard,
  };
}

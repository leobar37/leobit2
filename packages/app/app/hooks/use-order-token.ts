import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

const ORDER_TOKEN_KEY = "order-token";

export interface OrderToken {
  id: string;
  orderId: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Hook to get the token for a specific order
 * Online only - tokens are server-side
 */
export function useOrderToken(orderId: string) {
  return useQuery({
    queryKey: [ORDER_TOKEN_KEY, orderId],
    queryFn: async () => {
      const { data, error } = await api.orders({ id: orderId }).token.get();
      if (error) {
        console.error("Error fetching order token:", error);
        throw new Error(String(error.value));
      }
      const tokenData = (data as { data: OrderToken | null })?.data;
      console.log("Order token fetched:", tokenData ? "exists" : "null");
      return tokenData;
    },
    enabled: !!orderId,
    retry: 1,
    staleTime: 0,
  });
}

/**
 * Hook to generate a new token for an order
 * Online only
 */
export function useGenerateOrderToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await api.orders({ id: orderId }).token.post();
      if (error) throw new Error(String(error.value));
      return (data as { data: { token: string } })?.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDER_TOKEN_KEY, orderId] });
    },
  });
}

/**
 * Hook to regenerate (replace) an existing token
 * Online only
 */
export function useRegenerateOrderToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // First delete the old token by toggling off, then generate new
      // Or use a dedicated regenerate endpoint if available
      const { data, error } = await api.orders({ id: orderId }).token.post();
      if (error) throw new Error(String(error.value));
      return (data as { data: { token: string } })?.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDER_TOKEN_KEY, orderId] });
    },
  });
}

/**
 * Build the public URL for sharing an order
 */
export function buildOrderShareUrl(token: string): string {
  return `${window.location.origin}/pedido/${token}`;
}

/**
 * Build WhatsApp share message
 */
export function buildWhatsAppMessage(url: string, orderId: string): string {
  const shortId = orderId.slice(-8);
  return `Hola! Puedes ver y completar tu pedido aquí: ${url}\n\nPedido #${shortId}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share via WhatsApp
 */
export function shareViaWhatsApp(phone: string, message: string): void {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phone}?text=${encodedMessage}`;
  window.open(url, "_blank");
}

/**
 * Share via native Web Share API (mobile)
 */
export async function shareNative(data: { title: string; text: string; url: string }): Promise<boolean> {
  if (!navigator.share) return false;
  
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

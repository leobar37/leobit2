import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

const WHATSAPP_MESSAGES_KEY = ["whatsapp", "messages"];
const WHATSAPP_MESSAGE_KEY = (id: string) => ["whatsapp", "messages", id];
const WHATSAPP_STATS_KEY = ["whatsapp", "messages", "stats"];

export type MessageStatus = "enviado" | "fallido";

export interface WhatsAppMessage {
  id: string;
  businessUserId: string;
  businessId: string;
  customerId: string;
  templateId: string | null;
  phoneNumber: string;
  messageContent: string;
  status: MessageStatus;
  errorMessage: string | null;
  sentAt: string;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
  };
  template?: {
    id: string;
    name: string;
    content: string;
  } | null;
}

export interface MessageFilters {
  status?: MessageStatus;
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface SendMessageInput {
  customerId: string;
  templateId: string;
  variables?: Record<string, string | number>;
  saleId?: string;
}

export interface MessageStats {
  total: number;
  sent: number;
  failed: number;
}

async function fetchMessages(
  filters: MessageFilters = {}
): Promise<{ messages: WhatsAppMessage[]; total: number }> {
  const params: Record<string, string> = {};

  if (filters.status) params.status = filters.status;
  if (filters.customerId) params.customerId = filters.customerId;
  if (filters.search) params.search = filters.search;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.limit !== undefined) params.limit = filters.limit.toString();
  if (filters.offset !== undefined) params.offset = filters.offset.toString();

  const { data, error } = await api.whatsapp.messages.get({
    query: params,
  });

  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to fetch messages");

  return {
    messages: data.data as unknown as WhatsAppMessage[],
    total: (data.meta as { total: number })?.total || 0,
  };
}

async function fetchStats(): Promise<MessageStats> {
  const { data, error } = await api.whatsapp.messages.stats.get();

  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to fetch stats");

  return data.data as unknown as MessageStats;
}

async function sendMessage(input: SendMessageInput): Promise<WhatsAppMessage> {
  const { data, error } = await api.whatsapp.send.post(input);

  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to send message");

  return data.data as unknown as WhatsAppMessage;
}

async function retryMessage(id: string): Promise<WhatsAppMessage> {
  const { data, error } = await api.whatsapp.messages({ id }).retry.post();

  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to retry message");

  return data.data as unknown as WhatsAppMessage;
}

export function useWhatsAppMessages(filters: MessageFilters = {}) {
  return useQuery({
    queryKey: [...WHATSAPP_MESSAGES_KEY, filters],
    queryFn: () => fetchMessages(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWhatsAppMessageStats() {
  return useQuery({
    queryKey: WHATSAPP_STATS_KEY,
    queryFn: fetchStats,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_MESSAGES_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_STATS_KEY });
    },
  });
}

export function useRetryWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: retryMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_MESSAGES_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_STATS_KEY });
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";

const WHATSAPP_MESSAGES_KEY = ["whatsapp", "messages"];
const WHATSAPP_STATS_KEY = ["whatsapp", "stats"];

export interface SendWhatsAppMessageInput {
  customerId: string;
  templateId: string;
  variables?: Record<string, string | number>;
  saleId?: string;
}

export interface WhatsAppMessage {
  id: string;
  customerId: string;
  templateId: string;
  saleId: string | null;
  phoneNumber: string;
  messageContent: string;
  status: "enviado" | "entregado" | "fallido" | "pendiente";
  errorMessage?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

async function sendWhatsAppMessage(
  input: SendWhatsAppMessageInput
): Promise<WhatsAppMessage> {
  const { data, error } = await api.whatsapp.send.post({
    customerId: input.customerId,
    templateId: input.templateId,
    variables: input.variables,
    saleId: input.saleId,
  });
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to send WhatsApp message");
  return data.data as unknown as WhatsAppMessage;
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendWhatsAppMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_MESSAGES_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_STATS_KEY });
    },
  });
}

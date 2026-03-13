import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";

const WHATSAPP_SETTINGS_KEY = ["whatsapp", "settings"];
const WHATSAPP_STATUS_KEY = ["whatsapp", "status"];

export interface WhatsAppConnectionStatus {
  isConnected: boolean;
  state: "open" | "close" | "connecting" | "unknown";
  phoneNumber: string | null;
  instanceName: string | null;
  qrCode?: string | null;
}

export interface WhatsAppConnectResult {
  qrCode: string;
  instanceName: string;
}

export interface WhatsAppSettings {
  id: string;
  businessUserId: string;
  businessId: string;
  isConnected: boolean;
  phoneNumber: string | null;
  instanceName: string | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchWhatsAppStatus(): Promise<WhatsAppConnectionStatus> {
  const { data, error } = await api.whatsapp.settings.status.get();
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to fetch WhatsApp status");
  return data.data as unknown as WhatsAppConnectionStatus;
}

async function fetchWhatsAppSettings(): Promise<WhatsAppSettings> {
  const { data, error } = await api.whatsapp.settings.get();
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to fetch WhatsApp settings");
  return data.data as unknown as WhatsAppSettings;
}

async function connectWhatsApp(): Promise<WhatsAppConnectResult> {
  const { data, error } = await api.whatsapp.settings.connect.post();
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to connect WhatsApp");
  return data.data as unknown as WhatsAppConnectResult;
}

async function disconnectWhatsApp(): Promise<void> {
  const { data, error } = await api.whatsapp.settings.disconnect.post();
  if (error) throw new Error(String(error.value));
  if (!data?.success) throw new Error("Failed to disconnect WhatsApp");
}

export function useWhatsAppStatus(refetchInterval: number | false = false) {
  return useQuery({
    queryKey: WHATSAPP_STATUS_KEY,
    queryFn: fetchWhatsAppStatus,
    refetchInterval,
    staleTime: 0,
  });
}

export function useWhatsAppSettings() {
  return useQuery({
    queryKey: WHATSAPP_SETTINGS_KEY,
    queryFn: fetchWhatsAppSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnectWhatsApp() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: connectWhatsApp,
    offlineMessage: "Se requiere conexión a internet para vincular WhatsApp",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_SETTINGS_KEY });
    },
  });
}

export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: disconnectWhatsApp,
    offlineMessage: "Se requiere conexión a internet para desvincular WhatsApp",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_SETTINGS_KEY });
    },
  });
}

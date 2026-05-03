import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";

export interface PaymentMethodConfig {
  enabled: boolean;
  phone?: string;
  accountName?: string;
  accountNumber?: string;
  bank?: string;
  cci?: string;
  qrImageUrl?: string;
}

export interface PaymentMethodsConfig {
  id: string;
  businessId: string;
  methods: {
    efectivo: PaymentMethodConfig;
    yape: PaymentMethodConfig;
    plin: PaymentMethodConfig;
    transferencia: PaymentMethodConfig;
    tarjeta: PaymentMethodConfig;
    saldo?: PaymentMethodConfig;
  };
  createdAt: Date;
  updatedAt: Date;
}

async function getPaymentMethodsConfig(): Promise<PaymentMethodsConfig> {
  const response = await api["businesses"]["payment-methods"].get();
  return extractData(response, "Failed to load payment methods configuration");
}

async function updatePaymentMethodsConfig(
  methods: PaymentMethodsConfig["methods"]
): Promise<PaymentMethodsConfig> {
  const response = await api["businesses"]["payment-methods"].put({
    methods,
  });
  return extractData(
    response,
    "Failed to update payment methods configuration"
  );
}

export function usePaymentMethodsConfig() {
  return useQuery({
    queryKey: PERSISTED_REMOTE_QUERY_KEYS.paymentMethodsConfig,
    queryFn: getPaymentMethodsConfig,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
}

export function useUpdatePaymentMethodsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePaymentMethodsConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(
        PERSISTED_REMOTE_QUERY_KEYS.paymentMethodsConfig,
        data
      );
    },
  });
}

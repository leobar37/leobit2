import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";

const QUERY_KEY = "payment-methods-config";

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
    queryKey: [QUERY_KEY],
    queryFn: getPaymentMethodsConfig,
  });
}

export function useUpdatePaymentMethodsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePaymentMethodsConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

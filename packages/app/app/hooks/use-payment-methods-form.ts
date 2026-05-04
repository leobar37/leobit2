import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  paymentMethodsSchema,
  type PaymentMethodsFormData,
} from "~/lib/schemas/payment-methods";
import {
  usePaymentMethodsConfig,
  useUpdatePaymentMethodsConfig,
} from "./use-payment-methods-config";

const DEFAULT_METHODS: PaymentMethodsFormData = {
  efectivo: { enabled: true },
  yape: { enabled: false },
  plin: { enabled: false },
  transferencia: { enabled: false },
  tarjeta: { enabled: false },
};

export function usePaymentMethodsForm() {
  const { data: config, isLoading } = usePaymentMethodsConfig();
  const mutation = useUpdatePaymentMethodsConfig();

  const form = useForm<PaymentMethodsFormData>({
    resolver: zodResolver(paymentMethodsSchema),
    mode: "onChange",
    defaultValues: DEFAULT_METHODS,
  });

  // Reset form when server data loads
  useEffect(() => {
    if (config?.methods) {
      form.reset(config.methods);
    }
  }, [config, form]);

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data);
      form.reset(data);
      toast.success("Métodos de pago actualizados");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los métodos de pago";

      toast.error(message);
    }
  });

  return {
    form,
    onSubmit,
    isLoading,
    isPending: mutation.isPending,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
  };
}

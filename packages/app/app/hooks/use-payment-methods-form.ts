import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
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

  // Watch qrImageUrl fields for auto-save on QR upload
  const yapeQrUrl = useWatch({ control: form.control, name: "yape.qrImageUrl" });
  const plinQrUrl = useWatch({ control: form.control, name: "plin.qrImageUrl" });

  // Track previous values to detect actual changes
  const prevYapeQr = useRef<string | undefined>(undefined);
  const prevPlinQr = useRef<string | undefined>(undefined);
  const isAutoSaving = useRef(false);

  useEffect(() => {
    // Skip during initial load or if already auto-saving
    if (isLoading || isAutoSaving.current) return;

    // Detect if yape QR changed
    const yapeChanged = yapeQrUrl !== prevYapeQr.current && yapeQrUrl !== undefined;
    const plinChanged = plinQrUrl !== prevPlinQr.current && plinQrUrl !== undefined;

    if (yapeChanged || plinChanged) {
      // Update refs
      prevYapeQr.current = yapeQrUrl;
      prevPlinQr.current = plinQrUrl;

      // Only auto-save if form is valid
      if (form.formState.isValid) {
        isAutoSaving.current = true;
        const data = form.getValues();
        mutation.mutateAsync(data)
          .then(() => {
            form.reset(data);
            toast.success("Métodos de pago actualizados");
          })
          .catch((error) => {
            const message = error instanceof Error
              ? error.message
              : "No se pudieron guardar los métodos de pago";
            toast.error(message);
          })
          .finally(() => {
            isAutoSaving.current = false;
          });
      }
    }
  }, [yapeQrUrl, plinQrUrl, form, mutation, isLoading]);

  const submitForm = async (data: PaymentMethodsFormData) => {
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
      throw error;
    }
  };

  const onSubmit = form.handleSubmit(submitForm);

  return {
    form,
    onSubmit,
    submitForm,
    isLoading,
    isPending: mutation.isPending,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
  };
}

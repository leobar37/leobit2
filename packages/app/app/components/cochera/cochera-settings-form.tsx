import { useCallback } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormNumberInput } from "@/components/forms/form-number-input";
import { cn } from "~/lib/utils";

export const cocheraSettingsSchema = z.object({
  displayName: z.string().max(120, "Máximo 120 caracteres").optional(),
  displayAddress: z.string().optional(),
  hourlyRate: z.number({ message: "Ingresa un número válido" }).min(0, "Debe ser mayor o igual a 0"),
  dailyRate: z.number().min(0, "Debe ser mayor o igual a 0").nullable().optional(),
  graceMinutes: z.number({ message: "Ingresa un número válido" }).int("Debe ser un número entero").min(0, "Mínimo 0").max(120, "Máximo 120 minutos"),
  totalSpaces: z.number({ message: "Ingresa un número válido" }).int("Debe ser un número entero").min(0, "Mínimo 0"),
  acceptedPaymentMethods: z.array(z.enum(["efectivo", "yape", "plin"])).min(1, "Selecciona al menos un método de pago"),
});

export type CocheraSettingsFormData = z.infer<typeof cocheraSettingsSchema>;

interface CocheraSettingsFormProps {
  defaultValues?: CocheraSettingsFormData;
  onSubmit: (data: CocheraSettingsFormData) => void | Promise<void>;
  isSubmitting?: boolean;
}

const PAYMENT_METHOD_OPTIONS = [
  { id: "efectivo" as const, label: "Efectivo" },
  { id: "yape" as const, label: "Yape" },
  { id: "plin" as const, label: "Plin" },
];

export function CocheraSettingsForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: CocheraSettingsFormProps) {
  const form = useForm<CocheraSettingsFormData>({
    resolver: zodResolver(cocheraSettingsSchema),
    mode: "onChange",
    defaultValues: {
      displayName: "",
      displayAddress: "",
      hourlyRate: 0,
      dailyRate: null,
      graceMinutes: 10,
      totalSpaces: 20,
      acceptedPaymentMethods: ["efectivo"],
      ...defaultValues,
    },
  });

  const {
    formState: { errors, isValid, isDirty },
    watch,
    setValue,
  } = form;

  const acceptedMethods = watch("acceptedPaymentMethods") ?? [];

  const togglePaymentMethod = useCallback(
    (method: "efectivo" | "yape" | "plin") => {
      const current = new Set(acceptedMethods);
      if (current.has(method)) {
        current.delete(method);
      } else {
        current.add(method);
      }
      setValue("acceptedPaymentMethods", Array.from(current), {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [acceptedMethods, setValue]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormInput
          name="displayName"
          label="Nombre de la cochera"
          placeholder="Ej: Cochera San Juan"
          helperText="Este nombre se mostrará en tickets y reportes"
        />

        <FormInput
          name="displayAddress"
          label="Dirección"
          placeholder="Ej: Av. Principal 123"
          helperText="Dirección visible para clientes y autoridades"
        />

        <FormNumberInput
          name="hourlyRate"
          label="Tarifa por hora (S/) *"
          decimals={2}
          helperText="Tarifa estándar por cada hora de estacionamiento"
        />

        <FormNumberInput
          name="dailyRate"
          label="Tarifa por día completo (S/)"
          decimals={2}
          helperText="Deja en blanco si no aplicas tarifa diaria"
        />

        <FormNumberInput
          name="graceMinutes"
          label="Minutos de cortesía *"
          decimals={0}
          allowDecimal={false}
          helperText="Tiempo de gracia antes de cobrar la primera hora"
        />

        <FormNumberInput
          name="totalSpaces"
          label="Número de plazas *"
          decimals={0}
          allowDecimal={false}
          helperText="Capacidad total de vehículos"
        />

        <div className="space-y-3">
          <p className="text-sm font-medium">Métodos de pago aceptados *</p>
          <div className="grid grid-cols-3 gap-3">
            {PAYMENT_METHOD_OPTIONS.map((method) => {
              const isSelected = acceptedMethods.includes(method.id);
              return (
                <button
                  key={method.id}
                  type="button"
                  data-testid={`cochera-payment-method-${method.id}`}
                  onClick={() => togglePaymentMethod(method.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all",
                    isSelected
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : "border-gray-100 bg-gray-50/50 text-muted-foreground hover:border-gray-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  {method.label}
                </button>
              );
            })}
          </div>
          {errors.acceptedPaymentMethods?.message && (
            <p className="text-xs text-destructive">
              {errors.acceptedPaymentMethods.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            data-testid="cochera-settings-submit"
            disabled={isSubmitting || !isDirty || !isValid}
            className="h-14 w-full rounded-xl bg-orange-500 text-lg font-semibold hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

import { useCallback, useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Car, Bike, Truck, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { cn } from "~/lib/utils";
import { MobileFixedFooter, MobilePage } from "~/components/mobile";
import type { CocheraPaymentTiming, CocheraSettings, CocheraVehicleTypeConfig } from "@avileo/shared";

export const entryFormSchema = z.object({
  plate: z
    .string()
    .min(1, "Ingresa la placa")
    .max(20, "Placa muy larga")
    .transform((v) => v.trim().toUpperCase()),
  vehicleType: z.string().min(2, "Selecciona un tipo de vehículo"),
  notes: z.string().max(500, "Nota muy larga").optional(),
  paymentTiming: z.enum(["entry", "exit"]).optional(),
  entryAmountPaid: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().min(0, "Debe ser mayor o igual a 0").optional()
  ),
  entryPaymentMethod: z.enum(["efectivo", "yape", "plin"]).optional(),
});

export type EntryFormData = z.infer<typeof entryFormSchema>;

interface EntryFormProps {
  onSubmit: (data: EntryFormData) => void | Promise<void>;
  isSubmitting?: boolean;
  vehicleTypes?: CocheraVehicleTypeConfig[];
  settings?: CocheraSettings | null;
}

const VEHICLE_OPTIONS = [
  { id: "auto" as const, label: "Auto", icon: Car },
  { id: "moto" as const, label: "Moto", icon: Bike },
  { id: "camioneta" as const, label: "Camioneta", icon: Truck },
];

function getVehicleIcon(id: string) {
  if (id === "moto" || id === "motolineal" || id === "mototaxi") return Bike;
  if (id === "camioneta") return Truck;
  return Car;
}

export function EntryForm({ onSubmit, isSubmitting = false, vehicleTypes, settings }: EntryFormProps) {
  const rawOptions = useMemo(
    () => vehicleTypes?.filter((type) => type.enabled) ?? VEHICLE_OPTIONS,
    [vehicleTypes]
  );
  const options = useMemo(
    () =>
      rawOptions.map((type) => ({
        id: type.id,
        label: type.label,
        icon: getVehicleIcon(type.id),
      })),
    [rawOptions]
  );
  const form = useForm<EntryFormData>({
    resolver: zodResolver(entryFormSchema),
    mode: "onChange",
    defaultValues: {
      plate: "",
      vehicleType: options[0]?.id ?? "auto",
      notes: "",
      paymentTiming: settings?.defaultPaymentTiming ?? "exit",
      entryAmountPaid: settings?.hourlyBillingEnabled ? Number(settings.hourlyBaseRate) : 0,
      entryPaymentMethod: settings?.acceptedPaymentMethods[0] ?? "efectivo",
    },
  });

  const {
    formState: { isValid, isDirty },
    watch,
    setValue,
  } = form;

  const selectedType = watch("vehicleType");
  const paymentTiming = watch("paymentTiming") ?? settings?.defaultPaymentTiming ?? "exit";
  const acceptedMethods = settings?.acceptedPaymentMethods ?? ["efectivo"];

  useEffect(() => {
    if (!settings?.hourlyBillingEnabled || form.formState.isDirty) {
      return;
    }

    form.reset({
      plate: "",
      vehicleType: options[0]?.id ?? "auto",
      notes: "",
      paymentTiming: settings.defaultPaymentTiming,
      entryAmountPaid: settings.defaultPaymentTiming === "entry" ? Number(settings.hourlyBaseRate) : 0,
      entryPaymentMethod: settings.acceptedPaymentMethods[0] ?? "efectivo",
    });
  }, [form, options, settings]);

  const handleTypeSelect = useCallback(
    (type: string) => {
      setValue("vehicleType", type, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  const handlePaymentTimingSelect = useCallback(
    (value: CocheraPaymentTiming) => {
      setValue("paymentTiming", value, { shouldValidate: true, shouldDirty: true });
      if (value === "entry" && settings?.hourlyBillingEnabled) {
        setValue("entryAmountPaid", Number(settings.hourlyBaseRate), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    },
    [setValue, settings]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">Tipo de vehículo *</p>
          <div className="grid grid-cols-3 gap-3">
            {options.map((option) => {
              const isSelected = selectedType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`cochera-vehicle-type-${option.id}`}
                  onClick={() => handleTypeSelect(option.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-sm font-medium transition-all",
                    isSelected
                      ? "border-orange-300 bg-orange-50 text-orange-700 shadow-sm shadow-orange-500/10 dark:border-orange-400/55 dark:bg-orange-500/15 dark:text-orange-100"
                      : "border-gray-100 bg-gray-50/50 text-muted-foreground hover:border-gray-200 hover:text-foreground dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-orange-300/35 dark:hover:bg-orange-500/10 dark:hover:text-orange-50"
                  )}
                >
                  <option.icon className="h-6 w-6" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <FormInput
          name="plate"
          label="Placa *"
          placeholder="Ej: ABC-123"
          helperText="Ingresa la placa del vehículo"
          className="dark:border-white/10 dark:bg-white/[0.025] dark:focus-visible:border-orange-400/45 dark:focus-visible:ring-orange-400/20"
          autoCapitalize="characters"
          autoFocus
        />

        <FormInput
          name="notes"
          label="Notas (opcional)"
          placeholder="Ej: Cliente frecuente"
          helperText="Información adicional sobre el vehículo"
          className="dark:border-white/10 dark:bg-white/[0.025] dark:focus-visible:border-orange-400/45 dark:focus-visible:ring-orange-400/20"
        />

        {settings?.hourlyBillingEnabled ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <p className="text-sm font-semibold">Cobro por horas</p>
              <p className="text-xs text-muted-foreground">
                Base S/ {Number(settings.hourlyBaseRate).toFixed(2)} por {settings.hourlyBaseHours} h · Extra S/ {Number(settings.extraHourRate).toFixed(2)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "entry" as const, label: "Cobrar al entrar" },
                { id: "exit" as const, label: "Cobrar al salir" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePaymentTimingSelect(option.id)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-medium",
                    paymentTiming === option.id
                      ? "border-orange-400 bg-orange-500/10 text-orange-700 dark:text-orange-200"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {paymentTiming === "entry" ? (
              <div className="grid gap-3">
                <FormInput
                  name="entryAmountPaid"
                  label="Monto cobrado al entrar (S/)"
                  type="number"
                  min={0}
                  step={0.1}
                  className="dark:border-white/10 dark:bg-white/[0.025]"
                />
                <div className="grid grid-cols-3 gap-2">
                  {acceptedMethods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setValue("entryPaymentMethod", method, { shouldDirty: true })}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-sm capitalize",
                        watch("entryPaymentMethod") === method
                          ? "border-orange-400 bg-orange-500/10 text-orange-700 dark:text-orange-200"
                          : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <MobileFixedFooter aboveNav>
          <MobilePage.Root maxWidth="md">
          <Button
            type="submit"
            data-testid="cochera-entry-submit"
            disabled={isSubmitting || !isDirty || !isValid}
            className="h-14 w-full rounded-xl bg-orange-500 text-lg font-semibold hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                Registrar entrada
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          </MobilePage.Root>
        </MobileFixedFooter>
      </form>
    </FormProvider>
  );
}

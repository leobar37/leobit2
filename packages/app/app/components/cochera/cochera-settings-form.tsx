import { useCallback, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormInput } from "@/components/forms/form-input";
import { FormNumberInput } from "@/components/forms/form-number-input";
import { cn } from "~/lib/utils";
import { MobileFixedFooter, MobilePage } from "~/components/mobile";

const DEFAULT_VEHICLE_TYPES = [
  { id: "auto", label: "Auto", enabled: true, isDefault: true },
  { id: "moto", label: "Moto", enabled: true, isDefault: true },
  { id: "camioneta", label: "Camioneta", enabled: true, isDefault: true },
  { id: "mototaxi", label: "Mototaxi", enabled: true, isDefault: true },
  { id: "motolineal", label: "Motolineal", enabled: true, isDefault: true },
];

const pricingSchema = z.object({
  hourlyBillingEnabled: z.boolean(),
  hourlyRate: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  dailyRate: z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    z.number().min(0, "Debe ser mayor o igual a 0").nullable()
  ),
  hourlyBaseRate: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  hourlyBaseHours: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).int("Debe ser un número entero").min(1, "Mínimo 1")
  ),
  extraHourRate: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).min(0, "Debe ser mayor o igual a 0")
  ),
});

export const cocheraSettingsSchema = z.object({
  displayName: z.string().max(120, "Máximo 120 caracteres").optional(),
  displayAddress: z.string().optional(),
  hourlyRate: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  dailyRate: z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    z.number().min(0, "Debe ser mayor o igual a 0").nullable().optional()
  ),
  graceMinutes: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).int("Debe ser un número entero").min(0, "Mínimo 0").max(120, "Máximo 120 minutos")
  ),
  totalSpaces: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).int("Debe ser un número entero").min(0, "Mínimo 0")
  ),
  hourlyBillingEnabled: z.boolean().default(false),
  hourlyBaseRate: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  hourlyBaseHours: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).int("Debe ser un número entero").min(1, "Mínimo 1")
  ),
  extraHourRate: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number({ message: "Ingresa un número válido" }).min(0, "Debe ser mayor o igual a 0")
  ),
  defaultPaymentTiming: z.enum(["entry", "exit"]).default("exit"),
  acceptedPaymentMethods: z.array(z.enum(["efectivo", "yape", "plin"])).min(1, "Selecciona al menos un método de pago"),
  vehicleTypes: z.array(z.object({
    id: z.string().min(2),
    label: z.string().min(2, "Nombre requerido"),
    enabled: z.boolean(),
    isDefault: z.boolean().optional(),
    pricing: pricingSchema.nullable().optional(),
  })).min(1, "Configura al menos un tipo de vehículo"),
});

export type CocheraSettingsFormData = z.output<typeof cocheraSettingsSchema>;
type CocheraSettingsFormInput = z.input<typeof cocheraSettingsSchema>;

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

function getInitialValues(
  values?: Partial<CocheraSettingsFormInput>
): CocheraSettingsFormInput {
  return {
    displayName: "",
    displayAddress: "",
    hourlyRate: 0,
    dailyRate: null,
    graceMinutes: 10,
    totalSpaces: 20,
    hourlyBillingEnabled: false,
    hourlyBaseRate: 0,
    hourlyBaseHours: 1,
    extraHourRate: 0,
    defaultPaymentTiming: "exit",
    acceptedPaymentMethods: ["efectivo"],
    vehicleTypes: DEFAULT_VEHICLE_TYPES,
    ...values,
  };
}

function slugifyVehicleType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);
}

export function CocheraSettingsForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: CocheraSettingsFormProps) {
  const form = useForm<CocheraSettingsFormInput, unknown, CocheraSettingsFormData>({
    resolver: zodResolver(cocheraSettingsSchema),
    mode: "onChange",
    defaultValues: getInitialValues(defaultValues),
  });

  useEffect(() => {
    if (!defaultValues) {
      return;
    }

    form.reset(getInitialValues(defaultValues));
  }, [defaultValues, form]);

  const {
    formState: { errors, isValid, isDirty },
    watch,
    setValue,
  } = form;

  const acceptedMethods = watch("acceptedPaymentMethods") ?? [];
  const vehicleTypes = watch("vehicleTypes") ?? [];
  const hourlyBillingEnabled = watch("hourlyBillingEnabled");
  const defaultPaymentTiming = watch("defaultPaymentTiming") ?? "exit";
  const hourlyRate = watch("hourlyRate");
  const dailyRate = watch("dailyRate");
  const hourlyBaseRate = watch("hourlyBaseRate");
  const hourlyBaseHours = watch("hourlyBaseHours");
  const extraHourRate = watch("extraHourRate");

  const getDefaultVehiclePricing = useCallback(() => ({
    hourlyBillingEnabled: Boolean(hourlyBillingEnabled),
    hourlyRate: Number(hourlyRate) || 0,
    dailyRate: dailyRate == null ? null : Number(dailyRate) || 0,
    hourlyBaseRate: Number(hourlyBaseRate) || 0,
    hourlyBaseHours: Math.max(1, Number(hourlyBaseHours) || 1),
    extraHourRate: Number(extraHourRate) || 0,
  }), [
    dailyRate,
    extraHourRate,
    hourlyBaseHours,
    hourlyBaseRate,
    hourlyBillingEnabled,
    hourlyRate,
  ]);

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

  const toggleVehicleType = useCallback(
    (id: string) => {
      const next = vehicleTypes.map((type) =>
        type.id === id ? { ...type, enabled: !type.enabled } : type
      );
      setValue("vehicleTypes", next, { shouldValidate: true, shouldDirty: true });
    },
    [setValue, vehicleTypes]
  );

  const addVehicleType = useCallback(() => {
    const baseLabel = "Nuevo tipo";
    let index = 1;
    let id = slugifyVehicleType(baseLabel);
    const ids = new Set(vehicleTypes.map((type) => type.id));
    while (ids.has(id)) {
      index += 1;
      id = slugifyVehicleType(`${baseLabel} ${index}`);
    }
    setValue(
      "vehicleTypes",
      [...vehicleTypes, { id, label: index === 1 ? baseLabel : `${baseLabel} ${index}`, enabled: true, isDefault: false }],
      { shouldValidate: true, shouldDirty: true }
    );
  }, [setValue, vehicleTypes]);

  const updateVehicleLabel = useCallback(
    (id: string, label: string) => {
      const next = vehicleTypes.map((type) =>
        type.id === id
          ? { ...type, label, id: type.isDefault ? type.id : slugifyVehicleType(label) || type.id }
          : type
      );
      setValue("vehicleTypes", next, { shouldValidate: true, shouldDirty: true });
    },
    [setValue, vehicleTypes]
  );

  const removeVehicleType = useCallback(
    (id: string) => {
      setValue(
        "vehicleTypes",
        vehicleTypes.filter((type) => type.id !== id || type.isDefault),
        { shouldValidate: true, shouldDirty: true }
      );
    },
    [setValue, vehicleTypes]
  );

  const toggleVehiclePricing = useCallback(
    (index: number, enabled: boolean) => {
      setValue(
        `vehicleTypes.${index}.pricing`,
        enabled ? getDefaultVehiclePricing() : null,
        { shouldValidate: true, shouldDirty: true }
      );
    },
    [getDefaultVehiclePricing, setValue]
  );

  const toggleVehicleHourlyBilling = useCallback(
    (index: number, enabled: boolean) => {
      const currentPricing = vehicleTypes[index]?.pricing ?? getDefaultVehiclePricing();
      setValue(
        `vehicleTypes.${index}.pricing`,
        {
          ...currentPricing,
          hourlyBillingEnabled: enabled,
        },
        { shouldValidate: true, shouldDirty: true }
      );
    },
    [getDefaultVehiclePricing, setValue, vehicleTypes]
  );

  const setDefaultPaymentTiming = useCallback(
    (value: "entry" | "exit") => {
      setValue("defaultPaymentTiming", value, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  return (
    <FormProvider {...form}>
      <form
        id="cochera-settings-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 pb-32"
      >
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

        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() =>
              setValue("hourlyBillingEnabled", !hourlyBillingEnabled, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          >
            <div>
              <p className="text-sm font-semibold">Activar cobro por horas</p>
              <p className="text-xs text-muted-foreground">
                Usa tarifa base y costo por hora extra para este negocio.
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                hourlyBillingEnabled
                  ? "bg-orange-500 text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {hourlyBillingEnabled ? "Activo" : "Inactivo"}
            </span>
          </button>

          {hourlyBillingEnabled ? (
            <div className="grid gap-4 border-t border-border pt-4">
              <FormNumberInput
                name="hourlyBaseRate"
                label="Tarifa base (S/) *"
                decimals={2}
                helperText="Monto mínimo del estacionamiento por el tramo inicial"
              />
              <FormNumberInput
                name="hourlyBaseHours"
                label="Horas incluidas *"
                decimals={0}
                allowDecimal={false}
                helperText="Cantidad de horas cubiertas por la tarifa base"
              />
              <FormNumberInput
                name="extraHourRate"
                label="Hora extra (S/) *"
                decimals={2}
                helperText="Monto por cada hora adicional o fracción"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Cobro por defecto</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "entry" as const, label: "Al entrar" },
                    { id: "exit" as const, label: "Al salir" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDefaultPaymentTiming(option.id)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-sm font-medium",
                        defaultPaymentTiming === option.id
                          ? "border-orange-400 bg-orange-500/10 text-orange-700 dark:text-orange-200"
                          : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Métodos de pago aceptados *</p>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHOD_OPTIONS.map((method) => {
              const isSelected = acceptedMethods.includes(method.id);
              return (
                <button
                  key={method.id}
                  type="button"
                  data-testid={`cochera-payment-method-${method.id}`}
                  onClick={() => togglePaymentMethod(method.id)}
                  className={cn(
                    "flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-all",
                    isSelected
                      ? "border-orange-300 bg-orange-500/10 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-200"
                      : "border-border bg-card text-muted-foreground hover:border-orange-300 hover:text-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="truncate">{method.label}</span>
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

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Tipos de vehículo *</p>
            <p className="text-xs text-muted-foreground">
              Activa los tipos que usas o agrega uno propio.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {vehicleTypes.map((type, index) => (
              <div
                key={type.id}
                className="space-y-3 border-b border-border/70 px-3 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Switch
                    checked={type.enabled}
                    onCheckedChange={() => toggleVehicleType(type.id)}
                    data-testid={`cochera-vehicle-type-toggle-${type.id}`}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    {type.isDefault ? (
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          type.enabled ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {type.label}
                      </p>
                    ) : (
                      <input
                        value={type.label}
                        onChange={(event) => updateVehicleLabel(type.id, event.target.value)}
                        className="h-9 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-orange-400"
                      />
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {type.enabled ? "Disponible en entrada" : "Oculto en entrada"}
                    </p>
                  </div>
                  {!type.isDefault ? (
                    <button
                      type="button"
                      aria-label={`Eliminar ${type.label}`}
                      onClick={() => removeVehicleType(type.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <button
                    type="button"
                    data-testid={`cochera-vehicle-pricing-toggle-${type.id}`}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => toggleVehiclePricing(index, !type.pricing)}
                  >
                    <div>
                      <p className="text-sm font-medium">Tarifa propia</p>
                      <p className="text-xs text-muted-foreground">
                        {type.pricing
                          ? "Este tipo usa su propia tarifa al registrar entradas."
                          : "Usa la tarifa global por defecto."}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                        type.pricing
                          ? "bg-orange-500 text-white"
                          : "bg-background text-muted-foreground"
                      )}
                    >
                      {type.pricing ? "Activa" : "Global"}
                    </span>
                  </button>

                  {type.pricing ? (
                    <div className="mt-3 grid gap-3 border-t border-border pt-3">
                      <FormNumberInput
                        name={`vehicleTypes.${index}.pricing.hourlyRate`}
                        label="Tarifa por hora (S/) *"
                        decimals={2}
                      />
                      <FormNumberInput
                        name={`vehicleTypes.${index}.pricing.dailyRate`}
                        label="Tarifa por día completo (S/)"
                        decimals={2}
                      />
                      <button
                        type="button"
                        data-testid={`cochera-vehicle-hourly-billing-toggle-${type.id}`}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left"
                        onClick={() => toggleVehicleHourlyBilling(index, !type.pricing?.hourlyBillingEnabled)}
                      >
                        <div>
                          <p className="text-sm font-medium">Cobro por horas</p>
                          <p className="text-xs text-muted-foreground">
                            Tarifa base y hora extra para este vehículo.
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                            type.pricing.hourlyBillingEnabled
                              ? "bg-orange-500 text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {type.pricing.hourlyBillingEnabled ? "Activo" : "Inactivo"}
                        </span>
                      </button>
                      {type.pricing.hourlyBillingEnabled ? (
                        <div className="grid gap-3">
                          <FormNumberInput
                            name={`vehicleTypes.${index}.pricing.hourlyBaseRate`}
                            label="Tarifa base (S/) *"
                            decimals={2}
                          />
                          <FormNumberInput
                            name={`vehicleTypes.${index}.pricing.hourlyBaseHours`}
                            label="Horas incluidas *"
                            decimals={0}
                            allowDecimal={false}
                          />
                          <FormNumberInput
                            name={`vehicleTypes.${index}.pricing.extraHourRate`}
                            label="Hora extra (S/) *"
                            decimals={2}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addVehicleType} className="h-11 w-full rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Agregar tipo
          </Button>
          {errors.vehicleTypes?.message && (
            <p className="text-xs text-destructive">{errors.vehicleTypes.message}</p>
          )}
        </div>

        <MobileFixedFooter aboveNav>
          <MobilePage.Root maxWidth="md">
          <Button
            type="submit"
            form="cochera-settings-form"
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
          </MobilePage.Root>
        </MobileFixedFooter>
      </form>
    </FormProvider>
  );
}

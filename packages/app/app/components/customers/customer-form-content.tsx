import { useFormContext } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "@/components/forms/form-input";
import type { Customer } from "~/hooks/use-customers";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { cn } from "~/lib/utils";
import { useCreateWaterRoute, useWaterRoutes } from "~/hooks/use-water-routes";
import { useState } from "react";

const deliveryDayOptions = [
  { value: "monday", label: "Lun" },
  { value: "tuesday", label: "Mar" },
  { value: "wednesday", label: "Mié" },
  { value: "thursday", label: "Jue" },
  { value: "friday", label: "Vie" },
  { value: "saturday", label: "Sáb" },
  { value: "sunday", label: "Dom" },
];

export const customerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  waterProfile: z
    .object({
      deliveryFrequency: z.string(),
      deliveryDays: z.array(z.string()),
      defaultContainerQuantity: z.coerce.number().min(0),
      containersAtCustomer: z.coerce.number().min(0),
      depositAmount: z.coerce.number().min(0),
      depositStatus: z.string(),
      depositExceptionReason: z.string().nullable(),
      waterRouteId: z.string().nullable(),
      preferredRoute: z.string().nullable(),
      deliveryInstructions: z.string().nullable(),
    })
    .optional(),
});

export type CustomerFormData = z.input<typeof customerSchema>;

interface CustomerFormContentProps {
  customer?: Customer;
}

export function CustomerFormContent({ customer }: CustomerFormContentProps) {
  const { register, watch, setValue } = useFormContext<any>();
  const { mode } = useBusinessMode();
  const { data: waterRoutes = [] } = useWaterRoutes();
  const createWaterRoute = useCreateWaterRoute();
  const [newRouteName, setNewRouteName] = useState("");
  const isWaterMode = mode === "agua";
  const selectedDays = watch("waterProfile.deliveryDays") ?? [];

  const toggleDeliveryDay = (day: string) => {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((selectedDay: string) => selectedDay !== day)
      : [...selectedDays, day];
    setValue("waterProfile.deliveryDays", nextDays, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleCreateRoute = async () => {
    if (!newRouteName.trim()) return;
    const route = await createWaterRoute.mutateAsync({ name: newRouteName.trim() });
    setValue("waterProfile.waterRouteId", route.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setNewRouteName("");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl tracking-[-0.03em] font-semibold">
        {customer ? "Editar Cliente" : "Información del Cliente"}
      </h2>

      <FormInput
        name="name"
        label="Nombre"
        placeholder="Nombre completo"
      />

      <FormInput
        name="phone"
        label="Teléfono (opcional)"
        placeholder="987654321"
      />

      <FormInput
        name="address"
        label="Dirección (opcional)"
        placeholder="Av. Principal 123"
      />

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">
          Notas (opcional)
        </label>
        <textarea
          {...register("notes")}
          placeholder="Notas adicionales sobre el cliente..."
          className="shell-field min-h-[100px] w-full resize-none rounded-[20px] px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-200 dark:focus-visible:ring-orange-400/40 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <FormInput
        name="dni"
        label="DNI (opcional)"
        placeholder="12345678"
      />

      {isWaterMode && (
        <section className="space-y-4 rounded-[24px] border border-sky-200/80 bg-sky-50/70 p-4 dark:border-sky-400/20 dark:bg-sky-400/10">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Reparto de agua
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configura cuándo se visita al cliente y cuántos bidones suele pedir.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Frecuencia
            </label>
            <select
              {...register("waterProfile.deliveryFrequency")}
              className="shell-field h-12 w-full rounded-[20px] px-4 text-sm"
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
              <option value="on_demand">A pedido</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Días de reparto
            </label>
            <div className="grid grid-cols-4 gap-2">
              {deliveryDayOptions.map((day) => {
                const selected = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDeliveryDay(day.value)}
                    className={cn(
                      "h-10 rounded-xl border text-sm font-semibold transition-colors",
                      selected
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <FormInput
              name="waterProfile.defaultContainerQuantity"
              label="Bidones habituales"
              type="number"
              min={0}
              step={1}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Los bidones y recargas se venderán como productos por unidad. El control de envases retornables queda fuera del flujo base.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-muted-foreground">
                Ruta formal
              </label>
              <span className="text-xs text-muted-foreground">Formal</span>
            </div>
            <select
              {...register("waterProfile.waterRouteId")}
              className="shell-field h-12 w-full rounded-[20px] px-4 text-sm"
            >
              <option value="">Sin ruta</option>
              {waterRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                value={newRouteName}
                onChange={(event) => setNewRouteName(event.target.value)}
                placeholder="Nueva ruta..."
                className="shell-field h-11 min-w-0 flex-1 rounded-[18px] px-3 text-sm"
              />
              <button
                type="button"
                onClick={handleCreateRoute}
                disabled={!newRouteName.trim() || createWaterRoute.isPending}
                className="h-11 rounded-[18px] bg-sky-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>

          <FormInput
            name="waterProfile.preferredRoute"
            label="Zona libre (opcional)"
            placeholder="Ej. Sector mercado"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Instrucciones de entrega
            </label>
            <textarea
              {...register("waterProfile.deliveryInstructions")}
              placeholder="Ej. dejar en portería, llamar antes de llegar..."
              className="shell-field min-h-[88px] w-full resize-none rounded-[20px] px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-200 dark:focus-visible:ring-sky-400/40"
            />
          </div>
        </section>
      )}
    </div>
  );
}

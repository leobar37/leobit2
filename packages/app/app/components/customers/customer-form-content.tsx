import { useFormContext } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "@/components/forms/form-input";
import type { Customer } from "~/hooks/use-customers";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { WaterRouteSelector } from "~/components/water/water-route-selector";

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
  const { register, setValue, watch } = useFormContext<any>();
  const { mode } = useBusinessMode();
  const isWaterMode = mode === "agua";
  const selectedWaterRouteId = watch("waterProfile.waterRouteId") ?? null;

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
              Guarda los datos que ayudan a atender pedidos manuales y reposiciones puntuales.
            </p>
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
              Cantidad habitual que se entrega en cada visita de reparto.
            </p>
          </div>

          <WaterRouteSelector
            value={selectedWaterRouteId}
            onChange={(route) => {
              setValue("waterProfile.waterRouteId", route?.id ?? null, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            label="Ruta formal"
            helperText="Opcional"
            placeholder="Sin ruta"
            allowEmpty
          />

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

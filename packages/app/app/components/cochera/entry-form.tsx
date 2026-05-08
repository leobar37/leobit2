import { useCallback } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Car, Bike, Truck, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { cn } from "~/lib/utils";

export const entryFormSchema = z.object({
  plate: z
    .string()
    .min(1, "Ingresa la placa")
    .max(20, "Placa muy larga")
    .transform((v) => v.trim().toUpperCase()),
  vehicleType: z.enum(["auto", "moto", "camioneta"], {
    message: "Selecciona un tipo de vehículo",
  }),
  notes: z.string().max(500, "Nota muy larga").optional(),
});

export type EntryFormData = z.infer<typeof entryFormSchema>;

interface EntryFormProps {
  onSubmit: (data: EntryFormData) => void | Promise<void>;
  isSubmitting?: boolean;
}

const VEHICLE_OPTIONS = [
  { id: "auto" as const, label: "Auto", icon: Car },
  { id: "moto" as const, label: "Moto", icon: Bike },
  { id: "camioneta" as const, label: "Camioneta", icon: Truck },
];

export function EntryForm({ onSubmit, isSubmitting = false }: EntryFormProps) {
  const form = useForm<EntryFormData>({
    resolver: zodResolver(entryFormSchema),
    mode: "onChange",
    defaultValues: {
      plate: "",
      vehicleType: "auto",
      notes: "",
    },
  });

  const {
    formState: { isValid, isDirty },
    watch,
    setValue,
  } = form;

  const selectedType = watch("vehicleType");

  const handleTypeSelect = useCallback(
    (type: "auto" | "moto" | "camioneta") => {
      setValue("vehicleType", type, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">Tipo de vehículo *</p>
          <div className="grid grid-cols-3 gap-3">
            {VEHICLE_OPTIONS.map((option) => {
              const isSelected = selectedType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`cochera-vehicle-type-${option.id}`}
                  onClick={() => handleTypeSelect(option.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-4 text-sm font-medium transition-all",
                    isSelected
                      ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/70 dark:bg-orange-500/15 dark:text-orange-100"
                      : "border-gray-100 bg-gray-50/50 text-muted-foreground hover:border-gray-200 hover:text-foreground dark:border-white/12 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-orange-300/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-50"
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
          autoCapitalize="characters"
          autoFocus
        />

        <FormInput
          name="notes"
          label="Notas (opcional)"
          placeholder="Ej: Cliente frecuente"
          helperText="Información adicional sobre el vehículo"
        />

        <div className="pt-2">
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
        </div>
      </form>
    </FormProvider>
  );
}

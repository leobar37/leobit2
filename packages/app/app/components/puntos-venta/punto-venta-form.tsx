/**
 * Punto de Venta Form Component
 * Form for creating or editing puntos de venta
 */
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormInput } from "~/components/forms/form-input";
import { Button } from "@/components/ui/button";
import { useCreatePuntoVenta, useUpdatePuntoVenta, type PuntoVenta } from "~/hooks/use-puntos-venta";

const puntoVentaSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Máximo 100 caracteres"),
  code: z.string().max(20, "Máximo 20 caracteres").optional(),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  type: z.enum(["carro", "local", "mercado", "ruta", "otro"]).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

type PuntoVentaFormData = z.infer<typeof puntoVentaSchema>;

const TYPE_OPTIONS = [
  { value: "carro", label: "Carro" },
  { value: "local", label: "Local" },
  { value: "mercado", label: "Mercado" },
  { value: "ruta", label: "Ruta" },
  { value: "otro", label: "Otro" },
] as const;

interface PuntoVentaFormProps {
  puntoVenta?: PuntoVenta | null;
  onClose: () => void;
  onSuccess?: (puntoVenta: PuntoVenta) => void;
}

export function PuntoVentaForm({ puntoVenta, onClose, onSuccess }: PuntoVentaFormProps) {
  const form = useForm<PuntoVentaFormData>({
    resolver: zodResolver(puntoVentaSchema),
    mode: "onChange",
    defaultValues: {
      name: puntoVenta?.name || "",
      code: puntoVenta?.code || "",
      description: puntoVenta?.description || "",
      type: puntoVenta?.type || "otro",
      sortOrder: puntoVenta?.sortOrder || 0,
    },
  });

  const createPuntoVenta = useCreatePuntoVenta();
  const updatePuntoVenta = useUpdatePuntoVenta();

  const onSubmit = form.handleSubmit(async (formData) => {
    try {
      const submitData = {
        ...formData,
        sortOrder: formData.sortOrder ?? 0,
      };
      if (puntoVenta) {
        await updatePuntoVenta.mutateAsync({ id: puntoVenta.id, input: submitData });
        onClose();
      } else {
        const newPuntoVenta = await createPuntoVenta.mutateAsync(submitData as any);
        if (onSuccess) {
          onSuccess(newPuntoVenta);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error("Error saving punto de venta:", error);
    }
  });

  const isPending = createPuntoVenta.isPending || updatePuntoVenta.isPending;
  const selectedType = form.watch("type");

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
      <FormInput
        {...form.register("name", { required: "El nombre es requerido" })}
        label="Nombre"
        placeholder="Ej: Carro A, Mercado Central"
        error={form.formState.errors.name?.message}
        required
      />

      <FormInput
        {...form.register("code")}
        label="Código"
        placeholder="Ej: CAR-A, MC-01"
        error={form.formState.errors.code?.message}
      />

      <FormInput
        {...form.register("description")}
        label="Descripción"
        placeholder="Descripción opcional del punto de venta"
        error={form.formState.errors.description?.message}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => form.setValue("type", option.value)}
              className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedType === option.value
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-200 hover:border-orange-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={isPending || !form.formState.isValid}
        >
          {isPending
            ? "Guardando..."
            : puntoVenta
            ? "Actualizar"
            : "Crear"}
        </Button>
      </div>
      </form>
    </FormProvider>
  );
}

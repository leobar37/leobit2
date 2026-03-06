import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormNumberInput } from "@/components/forms/form-number-input";
import type { Distribucion } from "~/hooks/use-distribuciones";

const editDistribucionSchema = z.object({
  puntoVenta: z.string().min(1, "El punto de venta es requerido"),
  kilosAsignados: z.number().positive("Los kilos deben ser mayores a 0"),
});

type EditDistribucionFormData = z.infer<typeof editDistribucionSchema>;

interface EditDistribucionFormProps {
  distribucion: Distribucion;
  onSubmit: (data: Partial<Distribucion> & { id: string }) => void;
}

export function EditDistribucionForm({
  distribucion,
  onSubmit,
}: EditDistribucionFormProps) {
  const form = useForm<EditDistribucionFormData>({
    resolver: zodResolver(editDistribucionSchema),
    defaultValues: {
      puntoVenta: distribucion.puntoVenta,
      kilosAsignados: distribucion.kilosAsignados,
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit({ id: distribucion.id, ...data });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto">
        <FormInput
          name="puntoVenta"
          label="Punto de Venta"
          error={form.formState.errors.puntoVenta?.message}
        />
        
        <FormNumberInput
          name="kilosAsignados"
          label="Kilos Asignados"
          decimals={1}
          min="0.1"
          error={form.formState.errors.kilosAsignados?.message as string}
        />

        {distribucion.items && distribucion.items.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Items Asignados (solo lectura)</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {distribucion.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.variant?.product?.name || "Producto"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.variant?.name || "Variante"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {item.cantidadAsignada} {item.unidad}
                    </p>
                    {item.cantidadVendida > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Vendido: {item.cantidadVendida} {item.unidad}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
        >
          Guardar Cambios
        </Button>
      </form>
    </FormProvider>
  );
}

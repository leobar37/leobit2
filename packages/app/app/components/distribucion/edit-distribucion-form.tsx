import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormNumberInput } from "@/components/forms/form-number-input";
import { ProductVariantSelector } from "./product-variant-selector";
import { useProducts } from "~/hooks/use-products";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package } from "lucide-react";
import type { Distribucion } from "~/hooks/use-distribuciones";

const editDistribucionSchema = z.object({
  puntoVenta: z.string().min(1, "El punto de venta es requerido"),
  kilosAsignados: z.number().positive("Los kilos deben ser mayores a 0"),
});

type EditDistribucionFormData = z.infer<typeof editDistribucionSchema>;

interface EditDistribucionFormProps {
  distribucion: Distribucion;
  onSubmit: (data: Partial<Distribucion> & { id: string }) => void;
  onUpdateItems?: (items: Array<{ variantId: string; cantidadAsignada: number; unidad: string }>) => void;
}

export function EditDistribucionForm({
  distribucion,
  onSubmit,
  onUpdateItems,
}: EditDistribucionFormProps) {
  const { data: products } = useProducts();
  const [items, setItems] = useState<Array<{
    variantId: string;
    variantName: string;
    productName: string;
    cantidadAsignada: number;
    unidad: string;
  }>>([]);

  const form = useForm<EditDistribucionFormData>({
    resolver: zodResolver(editDistribucionSchema),
    defaultValues: {
      puntoVenta: distribucion.puntoVenta,
      kilosAsignados: distribucion.kilosAsignados,
    },
  });

  const handleAddItem = (variant: { id: string; name: string }, product: { name: string } | undefined, cantidad: number) => {
    const existingIndex = items.findIndex((item) => item.variantId === variant.id);
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        cantidadAsignada: updatedItems[existingIndex].cantidadAsignada + cantidad,
      };
      setItems(updatedItems);
    } else {
      setItems([
        ...items,
        {
          variantId: variant.id,
          variantName: variant.name,
          productName: product?.name || "Producto",
          cantidadAsignada: cantidad,
          unidad: "kg",
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmitItems = () => {
    if (items.length === 0) return;
    onUpdateItems?.(items.map((item) => ({
      variantId: item.variantId,
      cantidadAsignada: item.cantidadAsignada,
      unidad: item.unidad,
    })));
  };

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit({ id: distribucion.id, ...data });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {distribucion.modo === "libre" && (!distribucion.items || distribucion.items.length === 0) && (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium">Registrar productos entregados</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Esta distribución fue creada sin productos. Registra lo entregado aquí.
              </p>
            </div>

            <div className="space-y-2">
              <ProductVariantSelector
                products={products || []}
                onAddItem={handleAddItem}
              />
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Items a registrar ({items.length})</label>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.variantId}
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.variantName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-white whitespace-nowrap">
                          {item.cantidadAsignada} {item.unidad}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {items.length > 0 && (
              <Button
                type="button"
                onClick={handleSubmitItems}
                className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
              >
                Guardar Productos
              </Button>
            )}
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

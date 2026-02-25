import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign } from "lucide-react";
import { AssetPicker } from "@/components/assets/asset-picker";
import type { Product } from "~/lib/db/schema";

const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["pollo", "huevo", "otro"]),
  unit: z.enum(["kg", "unidad"]),
  basePrice: z.string().min(1, "El precio es requerido"),
  isActive: z.boolean(),
  imageId: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  product?: Product;
}

export function ProductForm({ onSubmit, onCancel, isLoading, product }: ProductFormProps) {
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: "onChange",
    values: isEditing
      ? {
          name: product.name,
          type: product.type,
          unit: product.unit,
          basePrice: product.basePrice,
          isActive: product.isActive,
          imageId: product.imageId ?? undefined,
        }
      : undefined,
    defaultValues: {
      name: "",
      type: "pollo",
      unit: "kg",
      basePrice: "",
      isActive: true,
      imageId: undefined,
    },
  });

  return (
    <Card className="border-0 shadow-lg rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl">Información del Producto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Nombre *
          </Label>
          <Input
            id="name"
            placeholder="Nombre del producto"
            {...register("name")}
            className="rounded-xl"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Imagen del producto</Label>
          <AssetPicker
            value={watch("imageId")}
            onChange={(id) => setValue("imageId", id)}
            placeholder="Seleccionar imagen"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Tipo *
          </Label>
          <select
            id="type"
            {...register("type")}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="pollo">Pollo</option>
            <option value="huevo">Huevo</option>
            <option value="otro">Otro</option>
          </select>
          {errors.type && (
            <p className="text-sm text-red-500">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Unidad *
          </Label>
          <select
            id="unit"
            {...register("unit")}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="kg">Kilogramo (kg)</option>
            <option value="unidad">Unidad</option>
          </select>
          {errors.unit && (
            <p className="text-sm text-red-500">{errors.unit.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="basePrice" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Precio base (S/) *
          </Label>
          <Input
            id="basePrice"
            placeholder="0.00"
            {...register("basePrice")}
            className="rounded-xl"
          />
          {errors.basePrice && (
            <p className="text-sm text-red-500">{errors.basePrice.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="isActive" className="flex items-center gap-2 cursor-pointer">
            <input
              id="isActive"
              type="checkbox"
              {...register("isActive")}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span>Activo</span>
          </Label>
          {errors.isActive && (
            <p className="text-sm text-red-500">{errors.isActive.message}</p>
          )}
        </div>

        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading || !isValid}
          className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
        >
          {isLoading
            ? "Guardando..."
            : isEditing
            ? "Guardar cambios"
            : "Guardar Producto"}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export type { ProductFormData };

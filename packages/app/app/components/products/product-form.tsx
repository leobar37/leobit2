import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { AssetPicker } from "@/components/assets/asset-picker";
import type { Product } from "~/lib/db/schema";
import { productSchema, type ProductFormData } from "~/lib/schemas/product-schema";

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  product?: Product;
  hasVariants?: boolean;
  variantCount?: number;
}

export function ProductForm({ onSubmit, onCancel, isLoading, product, hasVariants, variantCount }: ProductFormProps) {
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
          syncPriceToVariants: false,
        }
      : undefined,
    defaultValues: {
      name: "",
      type: "pollo",
      unit: "kg",
      basePrice: "",
      isActive: true,
      imageId: undefined,
      syncPriceToVariants: false,
    },
  });

  return (
    <Card className="border border-gray-100 shadow-none rounded-xl">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-semibold">Información del Producto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm">Nombre *</Label>
          <Input
            id="name"
            placeholder="Nombre del producto"
            {...register("name")}
            className="rounded-lg"
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Imagen del producto</Label>
          <AssetPicker
            value={watch("imageId")}
            onChange={(id) => setValue("imageId", id)}
            placeholder="Seleccionar imagen"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-sm">Tipo *</Label>
          <select
            id="type"
            {...register("type")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="pollo">Pollo</option>
            <option value="huevo">Huevo</option>
            <option value="otro">Otro</option>
          </select>
          {errors.type && (
            <p className="text-xs text-red-500">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unit" className="text-sm">Unidad *</Label>
          <select
            id="unit"
            {...register("unit")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="kg">Kilogramo (kg)</option>
            <option value="unidad">Unidad</option>
          </select>
          {errors.unit && (
            <p className="text-xs text-red-500">{errors.unit.message}</p>
          )}
        </div>

        {hasVariants && (
          <Alert className="bg-orange-50 border-orange-200 rounded-lg">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-xs text-orange-800">
              Este producto tiene {variantCount} {variantCount === 1 ? "variante" : "variantes"} con precios propios.
              El precio base solo se usa como referencia.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="basePrice" className="text-sm">Precio base (S/) *</Label>
          <Input
            id="basePrice"
            placeholder="0.00"
            {...register("basePrice")}
            className="rounded-lg"
          />
          {errors.basePrice && (
            <p className="text-xs text-red-500">{errors.basePrice.message}</p>
          )}
        </div>

        {hasVariants && (
          <div className="space-y-1.5">
            <Label htmlFor="syncPriceToVariants" className="flex items-center gap-2 cursor-pointer">
              <input
                id="syncPriceToVariants"
                type="checkbox"
                {...register("syncPriceToVariants")}
                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm">
                Sincronizar precio con todas las variantes
              </span>
            </Label>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="isActive" className="flex items-center gap-2 cursor-pointer">
            <input
              id="isActive"
              type="checkbox"
              {...register("isActive")}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm">Activo</span>
          </Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || !isValid}
            className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600"
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
              className="rounded-lg"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export type { ProductFormData };

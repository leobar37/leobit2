import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign } from "lucide-react";
import { FormMediaField } from "~/components/forms/form-media-field";
import { CategorySelect } from "@/components/products/category-select";
import type { Product } from "@avileo/shared";
import type { UseFormReturn } from "react-hook-form";
import { type ProductFormData } from "~/lib/schemas/product-schema";

interface ProductFormContentProps {
  form: UseFormReturn<ProductFormData>;
  product?: Product;
}

export function ProductFormContent({ form, product }: ProductFormContentProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card className="shell-card-flat rounded-[22px] border-0 bg-card/80 shadow-none dark:bg-[#151821]">
      <CardHeader>
        <CardTitle className="text-xl">
          {product ? "Editar Producto" : "Información del Producto"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Nombre *
          </Label>
          <Input
            id="name"
            data-testid="product-name-input"
            placeholder="Nombre del producto"
            {...register("name")}
            className="shell-field rounded-xl"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <FormMediaField
            name="imageId"
            label="Imagen del producto"
          />
        </div>

        <div className="space-y-2">
          <CategorySelect
            name="categoryId"
            label="Categoría"
            placeholder="Seleccionar categoría"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Unidad *
          </Label>
          <select
            id="unit"
            data-testid="product-unit-select"
            {...register("unit")}
            className="shell-field h-11 w-full rounded-xl px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
            data-testid="product-baseprice-input"
            placeholder="0.00"
            {...register("basePrice")}
            className="shell-field rounded-xl"
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
              className="h-4 w-4 rounded border-border text-orange-500 focus:ring-orange-500"
            />
            <span>Activo</span>
          </Label>
          {errors.isActive && (
            <p className="text-sm text-red-500">{errors.isActive.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

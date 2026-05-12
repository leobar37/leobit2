import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, DollarSign } from "lucide-react";
import { FormMediaField } from "~/components/forms/form-media-field";
import { CategorySelect } from "@/components/products/category-select";
import { ProductUnitSelector } from "@/components/products/product-unit-selector";
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
    <section className="space-y-4 border-b border-border/60 pb-4 dark:border-white/[0.07]">
      <h2 className="text-base font-semibold">
        {product ? "Editar producto" : "Información del producto"}
      </h2>

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
        <FormMediaField name="imageId" label="Imagen del producto" />
      </div>

      <div className="space-y-2">
        <CategorySelect
          name="categoryId"
          label="Categoría"
          placeholder="Seleccionar categoría"
        />
      </div>

      <div className="space-y-2">
        <ProductUnitSelector form={form} />
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
        <Label
          htmlFor="isActive"
          className="flex cursor-pointer items-center gap-2"
        >
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
    </section>
  );
}

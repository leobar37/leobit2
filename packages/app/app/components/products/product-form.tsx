import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { AssetPicker } from "@/components/assets/asset-picker";
import { CategorySelect } from "@/components/products/category-select";
import { ProductUnitSelector } from "@/components/products/product-unit-selector";
import type { Product } from "@avileo/shared";
import {
  productSchema,
  type ProductFormData,
} from "~/lib/schemas/product-schema";

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  product?: Product;
  hasVariants?: boolean;
  variantCount?: number;
}

export function ProductForm({
  onSubmit,
  onCancel,
  isLoading,
  product,
  hasVariants,
  variantCount,
}: ProductFormProps) {
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: "onChange",
    values: isEditing
      ? {
          name: product.name,
          categoryId: product.categoryId ?? null,
          unit: product.unit as "kg" | "unidad",
          basePrice: product.basePrice,
          isActive: product.isActive,
          imageId: product.imageId ?? undefined,
        }
      : undefined,
    defaultValues: {
      name: "",
      categoryId: null,
      unit: "kg",
      basePrice: "",
      isActive: true,
      imageId: undefined,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = form;
  const imageValue = watch("imageId");
  const imageId = typeof imageValue === "string" ? imageValue : undefined;
  const saveDisabledReason = !isValid
    ? "Completa nombre, unidad y precio para guardar."
    : null;

  return (
    <FormProvider {...form}>
      <section className="space-y-3 border-b border-border/60 pb-4 dark:border-white/[0.07]">
        <h2 className="text-base font-semibold">Información del producto</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm">
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
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Imagen del producto</Label>
          <AssetPicker
            value={imageId}
            onChange={(id) => setValue("imageId", id, { shouldDirty: true })}
            placeholder="Seleccionar imagen"
          />
        </div>

        <div className="space-y-1.5">
          <CategorySelect
            name="categoryId"
            label="Categoría"
            placeholder="Seleccionar categoría"
          />
        </div>

        <div className="space-y-1.5">
          <ProductUnitSelector form={form} errorClassName="text-xs" />
        </div>

        {hasVariants && (
          <Alert className="rounded-xl border-orange-500/20 bg-orange-500/10">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-xs text-orange-800 dark:text-orange-200">
              Este producto tiene {variantCount}{" "}
              {variantCount === 1 ? "variante" : "variantes"} con precios
              propios. El precio base solo se usa como referencia.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="basePrice" className="text-sm">
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
            <p className="text-xs text-red-500">{errors.basePrice.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
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
            <span className="text-sm">Activo</span>
          </Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            data-testid="save-product-button"
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || !isValid}
            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
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
              className="rounded-xl"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
        </div>
        {saveDisabledReason && (
          <p className="text-xs text-muted-foreground">{saveDisabledReason}</p>
        )}
      </section>
    </FormProvider>
  );
}

export type { ProductFormData } from "~/lib/schemas/product-schema";

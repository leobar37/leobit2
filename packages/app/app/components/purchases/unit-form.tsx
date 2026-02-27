import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Hash, Scale } from "lucide-react";
import type { ProductVariant } from "~/hooks/use-product-variants";
import type { ProductUnit } from "~/hooks/use-product-units";

const unitSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "Máximo 50 caracteres"),
  displayName: z
    .string()
    .min(1, "El nombre de visualización es requerido")
    .max(100, "Máximo 100 caracteres"),
  baseUnitQuantity: z
    .number()
    .min(0.001, "La cantidad mínima es 0.001")
    .max(9999.999, "Máximo 9999.999"),
  variantId: z.string().min(1, "Debe seleccionar una variante"),
  isActive: z.boolean(),
});

export type UnitFormData = z.infer<typeof unitSchema>;

interface UnitFormProps {
  productId: string;
  variants: ProductVariant[];
  onSubmit: (data: UnitFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  unit?: ProductUnit;
}

export function UnitForm({
  productId,
  variants,
  onSubmit,
  onCancel,
  isLoading,
  unit,
}: UnitFormProps) {
  const isEditing = !!unit;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    mode: "onChange",
    values: isEditing
      ? {
          name: unit.name,
          displayName: unit.displayName,
          baseUnitQuantity: parseFloat(unit.baseUnitQuantity),
          variantId: unit.variantId,
          isActive: unit.isActive,
        }
      : undefined,
    defaultValues: {
      name: "",
      displayName: "",
      baseUnitQuantity: 1,
      variantId: variants[0]?.id || "",
      isActive: true,
    },
  });

  return (
    <Card className="border-0 shadow-lg rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl">
          {isEditing ? "Editar Unidad" : "Nueva Unidad"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Nombre *
          </Label>
          <Input
            id="name"
            placeholder="Ej: Jaba"
            {...register("name")}
            className="rounded-xl"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Nombre de Visualización *
          </Label>
          <Input
            id="displayName"
            placeholder="Ej: Jaba de 60 huevos"
            {...register("displayName")}
            className="rounded-xl"
          />
          {errors.displayName && (
            <p className="text-sm text-red-500">{errors.displayName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="baseUnitQuantity" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Cantidad *
            </Label>
            <Input
              id="baseUnitQuantity"
              type="number"
              step="0.001"
              {...register("baseUnitQuantity", { valueAsNumber: true })}
              className="rounded-xl"
            />
            {errors.baseUnitQuantity && (
              <p className="text-sm text-red-500">{errors.baseUnitQuantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="variantId">Variante *</Label>
            <select
              id="variantId"
              {...register("variantId")}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Seleccionar variante</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </select>
            {errors.variantId && (
              <p className="text-sm text-red-500">{errors.variantId.message}</p>
            )}
          </div>
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
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || !isValid}
            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            {isLoading
              ? "Guardando..."
              : isEditing
              ? "Guardar cambios"
              : "Crear Unidad"}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

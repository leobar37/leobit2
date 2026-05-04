import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Hash, Scale } from "lucide-react";

const variantSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "Máximo 50 caracteres"),
  sku: z.string().max(50, "Máximo 50 caracteres").optional(),
  unitQuantity: z.number().min(0.001, "La cantidad mínima es 0.001").max(9999.999, "Máximo 9999.999"),
  price: z.number().min(0, "El precio no puede ser negativo").max(9999.99, "Máximo 9999.99"),
  isActive: z.boolean(),
});

type VariantFormData = z.infer<typeof variantSchema>;

interface VariantFormProps {
  onSubmit: (data: VariantFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  variant?: {
    id: string;
    name: string;
    sku: string | null;
    unitQuantity: string;
    price: string;
    isActive: boolean;
  };
}

export function VariantForm({ onSubmit, onCancel, isLoading, variant }: VariantFormProps) {
  const isEditing = !!variant;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<VariantFormData>({
    resolver: zodResolver(variantSchema),
    mode: "onChange",
    values: isEditing
      ? {
          name: variant.name,
          sku: variant.sku || undefined,
          unitQuantity: parseFloat(variant.unitQuantity),
          price: parseFloat(variant.price),
          isActive: variant.isActive,
        }
      : undefined,
    defaultValues: {
      name: "",
      unitQuantity: 1,
      price: 0,
      isActive: true,
    },
  });

  return (
    <Card className="shell-card-flat rounded-[22px] border-0 bg-card/80 shadow-none dark:bg-[#151821]">
      <CardHeader>
        <CardTitle className="text-xl">
          {isEditing ? "Editar Variante" : "Nueva Variante"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || !isValid}
            data-testid="save-variant-button"
            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            {isLoading
              ? "Guardando..."
              : isEditing
              ? "Guardar cambios"
              : "Crear Variante"}
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

        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Nombre *
          </Label>
          <Input
            id="name"
            data-testid="variant-name-input"
            placeholder="Ej: Jaba 30 unidades"
            {...register("name")}
            className="shell-field rounded-xl"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            SKU (opcional)
          </Label>
          <Input
            id="sku"
            data-testid="variant-sku-input"
            placeholder="Ej: SKU-001"
            {...register("sku")}
            className="shell-field rounded-xl"
          />
          {errors.sku && (
            <p className="text-sm text-red-500">{errors.sku.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="unitQuantity" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Cantidad Unit. *
            </Label>
            <NumericInput
              id="unitQuantity"
              data-testid="variant-unitquantity-input"
              decimals={3}
              {...register("unitQuantity", {
                setValueAs: (value) =>
                  value === "" ? undefined : Number.parseFloat(value),
              })}
              className="shell-field rounded-xl"
            />
            {errors.unitQuantity && (
              <p className="text-sm text-red-500">{errors.unitQuantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Precio (S/) *
            </Label>
            <NumericInput
              id="price"
              data-testid="variant-price-input"
              decimals={2}
              {...register("price", {
                setValueAs: (value) =>
                  value === "" ? undefined : Number.parseFloat(value),
              })}
              className="shell-field rounded-xl"
            />
            {errors.price && (
              <p className="text-sm text-red-500">{errors.price.message}</p>
            )}
          </div>
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
        </div>

      </CardContent>
    </Card>
  );
}

export type { VariantFormData };

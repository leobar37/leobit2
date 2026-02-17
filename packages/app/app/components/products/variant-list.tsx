import { Box, GripVertical, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface VariantListProps {
  variants: ProductVariant[];
  onEdit?: (variant: ProductVariant) => void;
  onDelete?: (variantId: string) => void;
  onReorder?: (variantIds: string[]) => void;
  onAdd?: () => void;
  isLoading?: boolean;
}

export function VariantList({
  variants,
  onEdit,
  onDelete,
  onReorder,
  onAdd,
  isLoading,
}: VariantListProps) {
  const sortedVariants = [...variants].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleMoveUp = (index: number) => {
    if (index === 0 || !onReorder) return;
    const newOrder = [...sortedVariants];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    onReorder(newOrder.map((v) => v.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === sortedVariants.length - 1 || !onReorder) return;
    const newOrder = [...sortedVariants];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    onReorder(newOrder.map((v) => v.id));
  };

  return (
    <Card className="border-0 shadow-lg rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl flex items-center gap-2">
          <Box className="h-5 w-5 text-orange-500" />
          Variantes
        </CardTitle>
        {onAdd && (
          <Button
            size="sm"
            onClick={onAdd}
            className="rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando variantes...
          </div>
        ) : sortedVariants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Box className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No hay variantes registradas</p>
            {onAdd && (
              <Button
                variant="outline"
                onClick={onAdd}
                className="mt-4 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1" />
                Crear primera variante
              </Button>
            )}
          </div>
        ) : (
          sortedVariants.map((variant, index) => (
            <div
              key={variant.id}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                variant.isActive
                  ? "bg-white hover:bg-orange-50"
                  : "bg-gray-50 opacity-60"
              }`}
            >
              {onReorder && (
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedVariants.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Box className="h-5 w-5 text-orange-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{variant.name}</h3>
                  {!variant.isActive && (
                    <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                  )}
                </div>
                {variant.sku && (
                  <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-orange-600 font-semibold">
                    S/ {variant.price}
                  </span>
                  <span className="text-muted-foreground">
                    Cant: {variant.unitQuantity}
                  </span>
                  {variant.inventory && (
                    <span className="text-muted-foreground">
                      Stock: {variant.inventory.quantity}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(variant)}
                    className="rounded-xl"
                  >
                    Editar
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(variant.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

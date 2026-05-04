import { Plus, Trash2, Package, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface VariantListProps {
  variants: ProductVariant[];
  onEdit?: (variant: ProductVariant) => void;
  onDelete?: (variantId: string) => void;
  onAdd?: () => void;
  onReorder?: (variantIds: string[]) => void;
  isLoading?: boolean;
}

export function VariantList({
  variants,
  onEdit,
  onDelete,
  onAdd,
  isLoading,
}: VariantListProps) {
  const sortedVariants = [...variants].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card className="shell-card-flat rounded-[22px] border-0 bg-card/80 shadow-none dark:bg-[#151821]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <Package className="h-5 w-5 text-orange-500" />
          Variantes
        </CardTitle>
        {onAdd && (
          <Button
            size="sm"
            onClick={onAdd}
            data-testid="add-variant-button"
            className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-4"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando variantes...
          </div>
        ) : sortedVariants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
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
          sortedVariants.map((variant) => (
            <div
              key={variant.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 transition-all ${
                variant.isActive
                  ? "border-border bg-background/70 hover:border-orange-500/30 hover:bg-accent/40"
                  : "border-border bg-muted/40 opacity-70"
              }`}
            >
               <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-foreground truncate">{variant.name}</h3>
                      {!variant.isActive && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Inactivo</Badge>
                      )}
                    </div>
                    {variant.sku && (
                      <p className="mb-2 text-xs text-muted-foreground">SKU: {variant.sku}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(variant)}
                        aria-label={`Editar variante ${variant.name}`}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-orange-500/10 hover:text-orange-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(variant.id)}
                        aria-label={`Desactivar variante ${variant.name}`}
                        className="h-8 w-8 rounded-lg text-red-500 hover:bg-destructive/10 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-orange-500 font-bold">
                    S/ {variant.price}
                  </span>
                  <span className="text-muted-foreground">
                    Cant: <span className="font-medium text-foreground">{variant.unitQuantity}</span>
                  </span>

                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

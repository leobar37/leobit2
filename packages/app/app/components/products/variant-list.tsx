import { Plus, Trash2, Package, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { cn } from "~/lib/utils";

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
  const sortedVariants = [...variants].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-orange-500" />
          <h2 className="text-base font-semibold text-foreground">Variantes</h2>
        </div>
        {onAdd && (
          <Button
            size="sm"
            onClick={onAdd}
            data-testid="add-variant-button"
            className="h-9 rounded-lg bg-orange-500 px-3 text-white hover:bg-orange-600"
          >
            <Plus className="mr-1 h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">
          Cargando variantes...
        </div>
      ) : sortedVariants.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <Package className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <p>No hay variantes registradas</p>
          {onAdd && (
            <Button
              variant="outline"
              onClick={onAdd}
              className="mt-4 rounded-xl"
            >
              <Plus className="mr-1 h-4 w-4" />
              Crear primera variante
            </Button>
          )}
        </div>
      ) : (
        <div>
          {sortedVariants.map((variant) => (
            <div
              key={variant.id}
              className={cn(
                "border-b border-border/60 px-1 py-3 transition-colors last:border-b-0 dark:border-white/[0.07]",
                variant.isActive
                  ? "hover:bg-muted/35 dark:hover:bg-white/[0.04]"
                  : "opacity-70",
              )}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <h3 className="truncate text-[0.95rem] font-semibold leading-5 text-foreground">
                      {variant.name}
                    </h3>
                    {!variant.isActive && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 rounded-full px-1.5 py-0 text-[10px]"
                      >
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  {variant.sku && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      SKU: {variant.sku}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="font-bold text-orange-500">
                      S/ {variant.price}
                    </span>
                    <span className="text-muted-foreground">
                      Cant:{" "}
                      <span className="font-medium text-foreground">
                        {variant.unitQuantity}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

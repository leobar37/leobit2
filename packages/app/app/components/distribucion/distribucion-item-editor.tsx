/**
 * Distribucion Item Editor
 * Reusable component for editing distribucion items
 * Following the purchase/sale item editor patterns
 */

import { useState } from "react";
import { Package, Trash2, Plus, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn, formatKilos } from "~/lib/utils";
import type { CreateDistribucionItemInput } from "~/hooks/use-distribuciones";
import { DistribucionItemSelector } from "./distribucion-item-selector";

// Extended type for UI with display names
type DistribucionItemEditorInput = CreateDistribucionItemInput & {
  productName?: string;
  variantName?: string;
}

interface DistribucionItemEditorProps {
  items: DistribucionItemEditorInput[];
  onItemsChange: (items: DistribucionItemEditorInput[]) => void;
  readOnly?: boolean;
}

export function DistribucionItemEditor({
  items,
  onItemsChange,
  readOnly = false,
}: DistribucionItemEditorProps) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddItem = (item: DistribucionItemEditorInput) => {
    onItemsChange([...items, item]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onItemsChange(newItems);
  };

  const handleUpdateQuantity = (index: number, cantidad: string) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      cantidadAsignada: parseFloat(cantidad) || 0,
    };
    onItemsChange(newItems);
  };

  const totalAsignado = items.reduce(
    (sum, item) => sum + item.cantidadAsignada,
    0
  );

  const excludeVariantIds = items.map((item) => item.variantId);

  return (
    <Card className="border-0 bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-orange-500" />
          Productos Asignados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay productos asignados</p>
            {!readOnly && (
              <p className="text-xs mt-1">
                Agrega productos para controlar qué lleva el vendedor
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${item.variantId}-${index}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl bg-card",
                  "border border-border/50",
                  readOnly && "opacity-75"
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/80 dark:bg-orange-500/15">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.variantName || "Producto"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.productName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {readOnly ? (
                    <span className="text-sm font-medium px-2">
                      {formatKilos(item.cantidadAsignada, 1)} {item.unidad}
                    </span>
                  ) : (
                    <>
                      <NumericInput
                        value={item.cantidadAsignada.toString()}
                        onChange={(e) =>
                          handleUpdateQuantity(index, e.target.value)
                        }
                        min="0.1"
                        decimals={1}
                        className="w-20 h-9 text-sm"
                      />
                      <span className="text-sm text-muted-foreground w-8">
                        {item.unidad}
                      </span>
                    </>
                  )}

                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {items.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total asignado
              </span>
              <span className="font-semibold">
                {formatKilos(totalAsignado, 1)} kg
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-orange-500" />
              <span>
                Cantidades referenciales — aun no hay control de unidades
              </span>
            </div>
          </div>
        )}

        {/* Add button */}
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-dashed"
            onClick={() => setIsSelectorOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Producto
          </Button>
        )}

        {/* Warning for no items */}
        {items.length === 0 && !readOnly && (
          <div className="flex items-center gap-2 text-amber-600 text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>Agrega al menos un producto para continuar</span>
          </div>
        )}
      </CardContent>

      <DistribucionItemSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={handleAddItem}
        excludeVariantIds={excludeVariantIds}
      />
    </Card>
  );
}

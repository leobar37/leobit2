import { Plus, Trash2, Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatWeight } from "~/lib/utils";
import { useOrderFormContext } from "./order-form-context";

export function OrderItemsManager() {
  const {
    items,
    setShowVariantSelector,
    handleRemoveItem,
  } = useOrderFormContext();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Items del pedido
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowVariantSelector(true)}
          data-testid="order-add-item-button"
          className="rounded-xl"
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-2" data-testid="order-items-list">
          {items.map((item, index) => (
            <Card key={index} className="border-0 shadow-sm" data-testid="order-item-card" data-item-index={index}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium" data-testid="order-item-product-name">{item.productName}</p>
                    <p className="text-sm text-muted-foreground" data-testid="order-item-variant-info">
                      {item.variantName} · {formatWeight(item.orderedQuantity)} unidades
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold" data-testid="order-item-total">
                      S/ {formatCurrency(item.orderedQuantity * item.unitPriceQuoted)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      data-testid="order-item-remove-button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

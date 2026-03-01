import { useMemo } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OrderItem } from "~/hooks/use-order-form";
import type { Product, ProductVariant } from "~/lib/db/schema";
import type { UseChickenCalculatorReturn } from "~/hooks/use-chicken-calculator";

interface OrderItemsManagerProps {
  items: OrderItem[];
  showItemForm: boolean;
  showVariantSelector: boolean;
  selectedProduct: Product | null;
  selectedVariant: ProductVariant | null;
  calculator: UseChickenCalculatorReturn;
  isKgProduct: boolean;
  onOpenVariantSelector: () => void;
  onCloseItemForm: () => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onChangeProduct: (product: Product, variant: ProductVariant) => void;
}

export function OrderItemsManager({
  items,
  showItemForm,
  showVariantSelector,
  selectedProduct,
  selectedVariant,
  calculator,
  isKgProduct,
  onOpenVariantSelector,
  onCloseItemForm,
  onAddItem,
  onRemoveItem,
  onChangeProduct,
}: OrderItemsManagerProps) {
  return (
    <div className="space-y-3">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Items del pedido
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenVariantSelector}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.variantName} · {item.orderedQuantity.toFixed(3)} unidades
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      S/ {(item.orderedQuantity * item.unitPriceQuoted).toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(index)}
                      className="h-8 w-8 text-red-500 hover:text-red-600"
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

      {/* Add Item Form with Calculator */}
      {showItemForm && selectedProduct && selectedVariant && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-4">
            {/* Product Info */}
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVariant.name} · S/ {selectedVariant.price} / {selectedProduct.unit}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onCloseItemForm();
                  onOpenVariantSelector();
                }}
              >
                Cambiar
              </Button>
            </div>

            {/* Calculator for kg products */}
            {isKgProduct ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Kilos brutos</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.000"
                      value={calculator.values.kilos}
                      onChange={(e) => calculator.handleChange("kilos", e.target.value)}
                      onFocus={() => calculator.setActiveField("kilos")}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Tara (kg)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={calculator.values.tara}
                      onChange={(e) => calculator.handleChange("tara", e.target.value)}
                      onFocus={() => calculator.setActiveField("tara")}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl">
                  <span className="text-sm text-orange-700">Kilos netos:</span>
                  <span className="font-semibold text-orange-700">
                    {calculator.kgNeto.toFixed(3)} kg
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Precio por kg</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={calculator.values.pricePerKg}
                      onChange={(e) => calculator.handleChange("pricePerKg", e.target.value)}
                      onFocus={() => calculator.setActiveField("pricePerKg")}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Total</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={calculator.values.totalAmount}
                      onChange={(e) => calculator.handleChange("totalAmount", e.target.value)}
                      onFocus={() => calculator.setActiveField("totalAmount")}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {calculator.filledCount >= 2 && (
                  <Badge variant="secondary" className="w-full justify-center py-1">
                    Calculado automáticamente
                  </Badge>
                )}
              </div>
            ) : (
              /* Simple inputs for unit-based products */
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Cantidad</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={calculator.values.kilos}
                    onChange={(e) => calculator.handleChange("kilos", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm">Precio unitario</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={calculator.values.pricePerKg}
                    onChange={(e) => calculator.handleChange("pricePerKg", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm">Total</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={calculator.values.totalAmount}
                    onChange={(e) => calculator.handleChange("totalAmount", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCloseItemForm}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={onAddItem}
                disabled={!calculator.isReady}
                className="flex-1 rounded-xl"
              >
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

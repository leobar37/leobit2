import { Plus, Trash2, Package, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrderFormContext } from "./order-form-context";
import type { KgCalculatorFormData, UnitCalculatorFormData } from "~/lib/sales/calculator-schema";
import type { UseFormRegister, UseFormWatch } from "react-hook-form";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface UnitCalculatorSectionProps {
  selectedVariant: ProductVariant;
  register: UseFormRegister<KgCalculatorFormData | UnitCalculatorFormData>;
  watch: UseFormWatch<KgCalculatorFormData | UnitCalculatorFormData>;
}

export function OrderItemsManager() {
  const {
    items,
    showItemForm,
    showVariantSelector,
    selectedProduct,
    selectedVariant,
    calculator,
    isKgProduct,
    setShowVariantSelector,
    setShowItemForm,
    handleAddItem,
    handleRemoveItem,
    handleVariantSelect,
  } = useOrderFormContext();

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
          onClick={() => setShowVariantSelector(true)}
          data-testid="order-add-item-button"
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
                      onClick={() => handleRemoveItem(index)}
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
                  setShowItemForm(false);
                  setShowVariantSelector(true);
                }}
              >
                Cambiar
              </Button>
            </div>

            {/* Calculator for kg products */}
            {/* Key forces form recreation when variant changes to use correct schema */}
            {isKgProduct ? (
              <div key={selectedVariant?.id} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Kilos brutos</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.000"
                      className="rounded-xl"
                      {...calculator.register("kilos")}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Tara (kg)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      className="rounded-xl"
                      {...calculator.register("tara")}
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
                      className="rounded-xl"
                      {...calculator.register("pricePerKg")}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Total</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="rounded-xl"
                      {...calculator.register("totalAmount")}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Simple inputs for unit-based products - with key to force recreation */
              <UnitCalculatorSection
                selectedVariant={selectedVariant}
                register={calculator.register}
                watch={calculator.watch}
              />
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowItemForm(false)}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!calculator.isValid}
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

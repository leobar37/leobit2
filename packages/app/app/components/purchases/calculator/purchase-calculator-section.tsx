import { useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VariantSelector } from "~/components/sales/variant-selector";
import { usePurchaseCalculator } from "~/hooks/use-purchase-calculator";
import { usePurchaseStore } from "~/stores/purchase.store";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

export function PurchaseCalculatorSection() {
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const { setSelection, clearSelection } = usePurchaseStore();

  const {
    form,
    formValues,
    products,
    isProductsLoading,
    selectedProductId,
    selectedVariantId,
    selectedUnitId,
    variants,
    units,
    hasVariants,
    hasUnits,
    baseUnitQuantity,
    calculation,
    isValid,
    handleClear,
    handleAddToCart,
    setFieldValue,
  } = usePurchaseCalculator();

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  const hasSelection = !!selectedProductId;

  const handleVariantSelect = (product: Product, variant: ProductVariant) => {
    setSelection(product.id, variant.id);
    setFieldValue("productId", product.id);
    setFieldValue("variantId", variant.id);
    setShowVariantSelector(false);
  };

  const handleChangeProduct = () => {
    setShowVariantSelector(true);
  };

  const handleClearSelection = () => {
    handleClear();
    clearSelection();
  };

  return (
    <section id="calculator-section" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Calcular Producto
        </h2>
        {selectedProduct && (
          <Badge variant="secondary" className="text-xs">
            {selectedProduct.name}
            {selectedVariant && ` - ${selectedVariant.name}`}
          </Badge>
        )}
      </div>

      {!hasSelection ? (
        <Card className="border-0 shadow-md rounded-2xl bg-muted/50">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Selecciona un producto para comenzar
            </p>

            <Button
              type="button"
              onClick={() => setShowVariantSelector(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Seleccionar Producto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-4 space-y-4">
            {/* Product Info */}
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">{selectedProduct?.name}</p>
                  {selectedVariant && (
                    <p className="text-sm text-muted-foreground">
                      {selectedVariant.name}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeProduct}
              >
                Cambiar
              </Button>
            </div>

            {/* Variant Selector */}
            {hasVariants && (
              <div className="space-y-2">
                <Label className="text-xs">Variante</Label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setFieldValue("variantId", e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar variante...</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Unit Selector */}
            {hasUnits && (
              <div className="space-y-2">
                <Label className="text-xs">Unidad de medida</Label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => {
                    setFieldValue("unitId", e.target.value);
                    setFieldValue("packs", undefined);
                    setFieldValue("quantity", undefined);
                  }}
                  className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Sin unidad (cantidad directa)</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.baseUnitQuantity} un)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity & Cost Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">
                  {selectedUnitId ? "Packs" : "Cantidad"}
                </Label>
                {selectedUnitId ? (
                  <>
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="Packs"
                      className="rounded-xl"
                      value={formValues.packs || ""}
                      onChange={(e) =>
                        setFieldValue("packs", parseFloat(e.target.value) || undefined)
                      }
                    />
                    {formValues.packs && baseUnitQuantity && (
                      <p className="text-xs text-orange-600 font-semibold">
                        = {formValues.packs * baseUnitQuantity} unidades
                      </p>
                    )}
                  </>
                ) : (
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="Cantidad"
                    className="rounded-xl"
                    {...form.register("quantity", {
                      valueAsNumber: true,
                    })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Costo unitario (S/)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="rounded-xl"
                  {...form.register("unitCost", {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <Label className="text-xs">Total (S/)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className="rounded-xl text-lg"
                value={formValues.totalAmount || ""}
                onChange={(e) => setFieldValue("totalAmount", e.target.value)}
              />
            </div>

            {/* Calculated Values */}
            {calculation.isValid && (
              <div className="p-3 bg-orange-50 rounded-xl">
                <p className="text-sm text-orange-600 font-medium">
                  Cantidad: {calculation.quantity} | Costo: S/{" "}
                  {calculation.unitCost.toFixed(2)} | Total: S/{" "}
                  {calculation.subtotal.toFixed(2)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearSelection}
                className="flex-1 rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={!isValid}
                className="flex-1 bg-orange-500 hover:bg-orange-600 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <VariantSelector
        open={showVariantSelector}
        onOpenChange={setShowVariantSelector}
        onSelect={handleVariantSelect}
      />
    </section>
  );
}

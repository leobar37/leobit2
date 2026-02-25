import { useAtom, useAtomValue } from "jotai";
import { ArrowRight, Box, Package, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VariantSelector } from "~/components/sales/variant-selector";
import {
  cartItemsAtom,
  packsInputAtom,
  selectedProductAtom,
  selectedVariantAtom,
  showVariantSelectorAtom,
  unitsInputAtom,
} from "~/atoms/new-sale";
import { useChickenCalculator } from "~/hooks/use-chicken-calculator";
import { addFromCalculator, isNumericText } from "~/lib/sales/cart-utils";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

export function CalculatorSection() {
  const [selectedProduct, setSelectedProduct] = useAtom(selectedProductAtom);
  const [selectedVariant, setSelectedVariant] = useAtom(selectedVariantAtom);
  const [showVariantSelector, setShowVariantSelector] = useAtom(showVariantSelectorAtom);
  const [cartItems, setCartItems] = useAtom(cartItemsAtom);
  const [unitsInput, setUnitsInput] = useAtom(unitsInputAtom);
  const [packsInput, setPacksInput] = useAtom(packsInputAtom);

  const { values, kgNeto, handleReset, handleChange, persistSelection } = useChickenCalculator({
    productPrice: selectedVariant?.price,
    productId: selectedProduct?.id,
    variantId: selectedVariant?.id,
    unitType: selectedProduct?.unit,
    persist: true,
  });

  const handleNumericTextChange = (setter: (value: string) => void, value: string) => {
    if (!isNumericText(value)) {
      return;
    }

    setter(value);
  };

  const handleVariantSelect = (product: Product, variant: ProductVariant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant);
    persistSelection(product.id, variant.id, variant.price);
    setShowVariantSelector(false);
    handleReset();
    setUnitsInput("");
    setPacksInput("");
  };

  const handleAddFromCalculator = () => {
    if (!selectedProduct || !selectedVariant) {
      return;
    }

    setCartItems(
      addFromCalculator({
        cartItems,
        selectedProduct,
        selectedVariant,
        values,
        kgNeto,
        packsInput,
        unitsInput,
      }),
    );

    persistSelection(selectedProduct.id, selectedVariant.id, values.pricePerKg);
  };

  return (
    <>
      <section id="calculator-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Calcular Producto</h2>
          {selectedVariant && (
            <Badge variant="secondary" className="text-xs">
              {selectedProduct?.name} - {selectedVariant.name}
            </Badge>
          )}
        </div>

        {!selectedVariant ? (
          <Card className="border-0 shadow-md rounded-2xl bg-muted/50">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Selecciona un producto para comenzar</p>
              <Button
                onClick={() => setShowVariantSelector(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Seleccionar Producto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-md rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Package className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedProduct?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedVariant.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowVariantSelector(true)}>
                  Cambiar
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Total (S/)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={values.totalAmount}
                    onChange={(e) => handleChange("totalAmount", e.target.value)}
                    placeholder="0.00"
                    className="rounded-xl text-lg"
                    autoFocus
                  />
                </div>

                {selectedProduct?.unit === "unidad" ? (
                  <>
                    <div>
                      <Label htmlFor="packs-input" className="text-xs">
                        Packs
                      </Label>
                      <Input
                        id="packs-input"
                        type="text"
                        inputMode="decimal"
                        value={packsInput}
                        onChange={(e) => handleNumericTextChange(setPacksInput, e.target.value)}
                        placeholder="0"
                        className="rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedVariant?.unitQuantity ? `${selectedVariant.unitQuantity} un por pack` : ""}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="units-input" className="text-xs">
                        Unidades
                      </Label>
                      <Input
                        id="units-input"
                        type="text"
                        inputMode="decimal"
                        value={unitsInput}
                        onChange={(e) => handleNumericTextChange(setUnitsInput, e.target.value)}
                        placeholder="0"
                        className="rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedVariant
                          ? (() => {
                              const q = Math.max(
                                1,
                                parseFloat(selectedVariant.unitQuantity || "1") || 1,
                              );
                              const p = parseFloat(selectedVariant.price || "0") || 0;
                              const per = q > 0 ? p / q : 0;
                              return per > 0 ? `S/ ${per.toFixed(2)} / un` : "";
                            })()
                          : ""}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs">Precio/kg (S/)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={values.pricePerKg}
                        onChange={(e) => handleChange("pricePerKg", e.target.value)}
                        placeholder="0.00"
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Bruto (kg)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={values.kilos}
                        onChange={(e) => handleChange("kilos", e.target.value)}
                        placeholder="0.000"
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tara (kg)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={values.tara}
                        onChange={(e) => handleChange("tara", e.target.value)}
                        placeholder="0"
                        className="rounded-xl"
                      />
                    </div>
                  </>
                )}
              </div>

              {selectedProduct?.unit === "kg" && (!!values.kilos || !!values.totalAmount) && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Neto</p>
                      <p className="text-lg font-bold text-orange-600">{kgNeto.toFixed(3)} kg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Total</p>
                      <p className="text-lg font-bold text-green-600">S/ {values.totalAmount || "0.00"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleAddFromCalculator}
                  disabled={
                    selectedProduct?.unit === "unidad"
                      ? ((parseFloat(packsInput) || 0) <= 0 && (parseFloat(unitsInput) || 0) <= 0) ||
                        !(parseFloat(selectedVariant?.price || "0") || 0)
                      : kgNeto <= 0 || !values.pricePerKg || (!values.kilos && !values.totalAmount)
                  }
                  className="w-full bg-orange-500 hover:bg-orange-600 h-12"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar al Carrito
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1 rounded-xl"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {selectedProduct?.unit === "unidad" ? "Limpiar" : "Limpiar Peso"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowVariantSelector(true)}
                    className="flex-1 rounded-xl"
                    size="sm"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Otro Producto
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <Button
          variant="outline"
          onClick={() => setShowVariantSelector(true)}
          className="w-full h-auto py-4 rounded-xl justify-start items-start text-wrap"
        >
          <Box className="h-5 w-5 mr-3 text-orange-500" />
          <div className="text-left">
            <p className="font-medium">Seleccionar Producto y Variante</p>
            <p className="text-xs text-muted-foreground">
              La primera variante activa se selecciona automaticamente
            </p>
          </div>
        </Button>
      </section>

      <VariantSelector
        open={showVariantSelector}
        onOpenChange={setShowVariantSelector}
        onSelect={handleVariantSelect}
      />
    </>
  );
}

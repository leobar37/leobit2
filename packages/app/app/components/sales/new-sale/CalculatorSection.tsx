import { useAtom } from "jotai";
import { Box, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormProvider } from "react-hook-form";
import { VariantSelector } from "~/components/sales/variant-selector";
import { showVariantSelectorAtom } from "~/atoms/new-sale";
import { useProductSelection } from "~/hooks/use-product-selection";
import { useSaleCalculator } from "~/hooks/use-sale-calculator";
import {
  KgCalculatorForm,
  UnitCalculatorForm,
  CalculatorActions,
} from "./calculator";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

export function CalculatorSection() {
  const [showVariantSelector, setShowVariantSelector] = useAtom(showVariantSelectorAtom);

  const {
    selectedProduct,
    selectedVariant,
    initialPrice,
    selectProduct,
    hasSelection,
  } = useProductSelection();

  const {
    form,
    isValid,
    calculation,
    handleClear,
    handleAddToCart,
  } = useSaleCalculator({
    product: selectedProduct,
    variant: selectedVariant,
    initialPrice,
  });

  const isKgProduct = selectedProduct?.unit === "kg";

  const handleVariantSelect = (product: Product, variant: ProductVariant) => {
    selectProduct(product.id, variant.id);
    setShowVariantSelector(false);
    handleClear();
  };

  const handleSelectAnother = () => {
    setShowVariantSelector(true);
  };

  return (
    <>
      <section id="calculator-section" className="space-y-3" data-testid="calculator-section">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Calcular Producto</h2>
          {selectedVariant && (
            <Badge variant="secondary" className="text-xs" data-testid="selected-variant-badge">
              {selectedProduct?.name} - {selectedVariant.name}
            </Badge>
          )}
        </div>

        {!hasSelection ? (
          <Card className="border-0 shadow-md rounded-2xl bg-muted/50" data-testid="calculator-empty-state">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Selecciona un producto para comenzar</p>
              <Button
                onClick={() => setShowVariantSelector(true)}
                data-testid="select-product-button"
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Seleccionar Producto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <FormProvider {...form}>
            <Card className="border-0 shadow-md rounded-2xl" data-testid="calculator-form">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl" data-testid="selected-product-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid="selected-product-name">{selectedProduct?.name}</p>
                      <p className="text-sm text-muted-foreground" data-testid="selected-variant-name">{selectedVariant?.name}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowVariantSelector(true)} data-testid="change-product-button">
                    Cambiar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Total (S/)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="rounded-xl text-lg"
                      data-testid="calculator-total-amount"
                      autoFocus
                      {...form.register("totalAmount")}
                    />
                  </div>

                  {isKgProduct ? (
                    <KgCalculatorForm kgNeto={calculation.kgNeto} variantPrice={selectedVariant?.price || ""} />
                  ) : (
                    <UnitCalculatorForm variant={selectedVariant} />
                  )}
                </div>

                <CalculatorActions
                  isValid={isValid}
                  isKgProduct={isKgProduct}
                  onAddToCart={handleAddToCart}
                  onClear={handleClear}
                  onSelectAnother={handleSelectAnother}
                />
              </CardContent>
            </Card>
          </FormProvider>
        )}
      </section>

      <section>
        <Button
          variant="outline"
          onClick={() => setShowVariantSelector(true)}
          data-testid="variant-selector-button"
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
        data-testid="variant-selector-modal"
      />
    </>
  );
}

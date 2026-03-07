import { useAtom } from "jotai";
import { Box, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormProvider, Controller } from "react-hook-form";
import { FormCalculatorInput } from "@/components/forms";
import { VariantSelector } from "~/components/sales/variant-selector";
import { showVariantSelectorAtom } from "~/atoms/new-sale";
import { useProductSelection } from "~/hooks/use-product-selection";
import { useSaleCalculator } from "~/hooks/use-sale-calculator";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import {
  KgCalculatorForm,
  UnitCalculatorForm,
  CalculatorActions,
} from "./calculator";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface CalculatorContentProps {
  onAddedToCart?: () => void;
}

function CalculatorContent({ onAddedToCart }: CalculatorContentProps) {
  const [showVariantSelector, setShowVariantSelector] = useAtom(showVariantSelectorAtom);
  const { settings } = useBusinessSettings();

  const {
    selectedProduct,
    selectedVariant,
    initialPrice,
    selectProduct,
    hasSelection,
  } = useProductSelection();

  const salesConfig = settings?.calculators.sales;

  const {
    form,
    isValid,
    calculation,
    handleClear,
    handleAddToCart,
    setFieldValue,
  } = useSaleCalculator({
    product: selectedProduct,
    variant: selectedVariant,
    initialPrice,
    autoFillPrice: salesConfig?.autoFillPrice ?? false,
  });

  const isKgProduct = selectedProduct?.unit === "kg";
  const hideTara = salesConfig?.hideTara ?? true;

  const handleVariantSelect = (product: Product, variant: ProductVariant) => {
    selectProduct(product.id, variant.id);
    setShowVariantSelector(false);
    handleClear();
  };

  const handleSelectAnother = () => {
    setShowVariantSelector(true);
  };

  const handleAddToCartAndClose = async () => {
    await handleAddToCart();
    if (onAddedToCart) {
      onAddedToCart();
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Calcular Producto</h2>
            {selectedVariant && (
              <Badge
                variant="secondary"
                className="hidden sm:inline-flex text-xs"
                data-testid="selected-variant-badge"
              >
                {selectedProduct?.name} - {selectedVariant.name}
              </Badge>
            )}
          </div>

          {!hasSelection ? (
            <Card className="border-0 shadow-md rounded-2xl bg-muted/50" data-testid="calculator-empty-state">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-sm text-muted-foreground">Selecciona un producto para comenzar</p>
                <Button
                  type="button"
                  onClick={handleSelectAnother}
                  data-testid="select-product-button"
                  className="bg-orange-500 hover:bg-orange-600 h-11 px-5 rounded-xl w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Seleccionar Producto
                </Button>
              </CardContent>
            </Card>
          ) : (
            <FormProvider {...form}>
              <Card className="border-0 shadow-md rounded-2xl bg-card" data-testid="calculator-form">
                <CardContent className="p-4 space-y-4">
                  <div
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100"
                    data-testid="selected-product-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Package className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium" data-testid="selected-product-name">{selectedProduct?.name}</p>
                        <p className="text-sm text-muted-foreground" data-testid="selected-variant-name">{selectedVariant?.name}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVariantSelector(true)}
                      data-testid="change-product-button"
                      className="text-orange-700 hover:bg-orange-100"
                    >
                      Cambiar
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {isKgProduct ? (
                      <>
                        <KgCalculatorForm
                          kgNeto={calculation.kgNeto}
                          variantPrice={selectedVariant?.price || ""}
                          hideTara={hideTara}
                          setFieldValue={setFieldValue}
                        />
                        <Controller
                          name="totalAmount"
                          control={form.control}
                          render={({ field }) => (
                            <FormCalculatorInput
                              label="Total (S/)"
                              placeholder="0.00"
                              decimals={2}
                              data-testid="calculator-total-amount"
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                setFieldValue("totalAmount", e.target.value);
                              }}
                            />
                          )}
                        />
                      </>
                    ) : (
                      <UnitCalculatorForm 
                        variant={selectedVariant} 
                        setFieldValue={setFieldValue}
                        formControl={form.control}
                      />
                    )}
                  </div>

                  <CalculatorActions
                    isValid={isValid}
                    isKgProduct={isKgProduct}
                    onAddToCart={handleAddToCartAndClose}
                    onClear={handleClear}
                    onSelectAnother={handleSelectAnother}
                  />
                </CardContent>
              </Card>
            </FormProvider>
          )}
        </div>
      </div>

      <div className="p-4 border-t bg-background">
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
      </div>

      <VariantSelector
        open={showVariantSelector}
        onOpenChange={setShowVariantSelector}
        onSelect={handleVariantSelect}
        data-testid="variant-selector-modal"
      />
    </>
  );
}

export { CalculatorContent };

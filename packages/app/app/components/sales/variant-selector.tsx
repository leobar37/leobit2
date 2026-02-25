import { useState, useEffect } from "react";
import { Package, ChevronRight, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "~/lib/utils";
import { useProducts } from "~/hooks/use-products-live";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface VariantSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: Product, variant: ProductVariant) => void;
}

type Step = "products" | "variants";

export function VariantSelector({ open, onOpenChange, onSelect }: VariantSelectorProps) {
  const [step, setStep] = useState<Step>("products");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: variants, isLoading: variantsLoading } = useVariantsByProduct(
    selectedProduct?.id || "",
    { isActive: true }
  );

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setStep("variants");
    setSelectedVariant(null);
  };

  const handleBack = () => {
    setStep("products");
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  const handleConfirm = () => {
    if (selectedProduct && selectedVariant) {
      onSelect(selectedProduct, selectedVariant);
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("products");
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  const filteredProducts = products?.filter((p) => p.isActive) || [];
  const activeVariants = variants?.filter((v) => v.isActive) || [];

  useEffect(() => {
    if (step === "variants" && activeVariants.length > 0 && !selectedVariant) {
      setSelectedVariant(activeVariants[0]);
    }
  }, [step, activeVariants, selectedVariant]);

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
          return;
        }

        onOpenChange(true);
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            {step === "products" ? (
              <>
                <Package className="h-5 w-5 text-orange-500" />
                Seleccionar Producto
              </>
            ) : (
              <>
                <button
                  onClick={handleBack}
                  className="p-1 -ml-1 rounded-lg hover:bg-orange-50"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <Box className="h-5 w-5 text-orange-500" />
                {selectedProduct?.name}
                {activeVariants.length > 1 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {activeVariants.length} variantes
                  </Badge>
                )}
              </>
            )}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2">
          {step === "products" ? (
            <div className="space-y-2">
              {productsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando productos...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay productos activos
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product)}
                    className="w-full text-left"
                  >
                    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            S/ {product.basePrice} / {product.unit}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Card>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {variantsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando variantes...
                </div>
              ) : activeVariants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay variantes activas para este producto
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {activeVariants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className="w-full text-left"
                      >
                        <Card
                          className={cn(
                            "p-3 cursor-pointer transition-all",
                            selectedVariant?.id === variant.id
                              ? "ring-2 ring-orange-500 bg-orange-50"
                              : "hover:shadow-md",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium">{variant.name}</h3>
                              {variant.sku && (
                                <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                              )}
                              <p className="text-sm text-orange-600 font-semibold">
                                S/ {variant.price}
                              </p>
                            </div>
                            {variant.inventory && (
                              <Badge
                                variant={
                                  parseFloat(variant.inventory.quantity) > 0
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {variant.inventory.quantity} {selectedProduct?.unit}
                              </Badge>
                            )}
                          </div>
                        </Card>
                      </button>
                    ))}
                  </div>

                </>
              )}
            </div>
          )}
        </div>

        {step === "variants" && selectedVariant && (
          <div className="border-t pt-4 mt-2">
            <Button
              onClick={handleConfirm}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Agregar al carrito
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

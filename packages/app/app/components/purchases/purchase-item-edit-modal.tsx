import { useState } from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface PurchaseItemEditModalProps {
  item?: {
    productName: string;
    variantName: string;
    quantity: string;
    unitCost: string;
    totalCost: string;
  };
  isNew?: boolean;
  onSave: (updates: {
    quantity: number;
    unitCost: number;
    productId?: string;
    variantId?: string;
    productName?: string;
    variantName?: string;
  }) => void;
  onClose: () => void;
}

export function PurchaseItemEditModal({
  item,
  isNew = false,
  onSave,
  onClose,
}: PurchaseItemEditModalProps) {
  const [step, setStep] = useState<"product" | "variant" | "details">("product");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(item?.quantity || "0");
  const [unitCost, setUnitCost] = useState(item?.unitCost || "0");

  const { data: products = [], isLoading: isProductsLoading } = useProducts();
  const { data: variants = [], isLoading: isVariantsLoading } = useVariantsByProduct(selectedProduct?.id || "", { isActive: true });

  const qty = parseFloat(quantity) || 0;
  const cost = parseFloat(unitCost) || 0;
  const total = qty * cost;

  const handleSave = () => {
    onSave({
      quantity: qty,
      unitCost: cost,
      productId: selectedProduct?.id,
      variantId: selectedVariant?.id,
      productName: selectedProduct?.name,
      variantName: selectedVariant?.name,
    });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    if (product.hasVariants && variants.length > 0) {
      setStep("variant");
    } else {
      // No variants, go directly to details
      setSelectedVariant(null);
      setStep("details");
    }
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setStep("details");
  };

  const handleBack = () => {
    if (step === "variant") {
      setStep("product");
      setSelectedProduct(null);
    } else if (step === "details") {
      if (selectedProduct?.hasVariants) {
        setStep("variant");
        setSelectedVariant(null);
      } else {
        setStep("product");
        setSelectedProduct(null);
      }
    }
  };

  const canSave = isNew ? (selectedProduct !== null && qty > 0) : true;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-background rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-auto flex flex-col">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {step !== "product" && (
              <button
                onClick={handleBack}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
            )}
            <h2 className="text-lg font-bold">
              {isNew
                ? step === "product"
                  ? "Seleccionar Producto"
                  : step === "variant"
                  ? "Seleccionar Variante"
                  : "Agregar Producto"
                : "Editar Producto"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CardContent className="flex-1 overflow-auto p-4">
          {/* Product Selection Step */}
          {step === "product" && (
            <div className="space-y-2">
              {isProductsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full p-3 text-left rounded-xl border hover:bg-orange-50 hover:border-orange-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.hasVariants ? `${variants.length} variantes` : product.unit}
                        </p>
                      </div>
                      <Badge variant="secondary">{product.type}</Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Variant Selection Step */}
          {step === "variant" && selectedProduct && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                Variantes de {selectedProduct.name}:
              </p>
              {isVariantsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => handleSelectVariant(variant)}
                    className="w-full p-3 text-left rounded-xl border hover:bg-orange-50 hover:border-orange-200 transition-colors"
                  >
                    <p className="font-medium">{variant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Peso promedio: {variant.averageWeight || "N/A"}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Details Step */}
          {step === "details" && (
            <div className="space-y-4">
              {/* Selected Product/Variant Info */}
              <div className="p-3 bg-orange-50 rounded-xl">
                <p className="font-medium">{selectedProduct?.name}</p>
                {selectedVariant && (
                  <p className="text-sm text-muted-foreground">
                    {selectedVariant.name}
                  </p>
                )}
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad (kg)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-lg font-medium"
                  step="0.1"
                  min="0"
                  autoFocus
                />
              </div>

              {/* Unit Cost Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Costo Unitario (S/)</label>
                <input
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-lg font-medium"
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl">
                <span className="font-medium">Total:</span>
                <span className="text-2xl font-bold text-orange-600">
                  S/ {formatCurrency(total)}
                </span>
              </div>
            </div>
          )}
        </CardContent>

        <div className="sticky bottom-0 bg-background border-t p-4 space-y-2">
          {step === "details" ? (
            <>
              <Button
                onClick={handleSave}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
                disabled={!canSave}
              >
                Agregar
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full rounded-xl"
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full rounded-xl"
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  Trash2,
  Plus,
  Calculator as CalculatorIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import { useCalculator } from "~/hooks/use-calculator";
import { formatCurrency, formatKilos, cn } from "~/lib/utils";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { usePurchaseForm } from "../purchase-form-context";

interface PurchaseCalculatorContentProps {
  onAddedToCart?: () => void;
}

export function PurchaseCalculatorContent({ onAddedToCart }: PurchaseCalculatorContentProps) {
  const navigate = useNavigate();
  const { addItem } = usePurchaseForm();
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const { data: products = [] } = useProducts();
  const selectedProduct = products.find(p => p.id === selectedProductId);

  const { data: variants = [] } = useVariantsByProduct(selectedProductId || "", {
    isActive: true
  });
  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  const {
    form,
    isValid,
    isKgProduct,
    calculation,
    handleClear,
  } = useCalculator({
    product: selectedProduct,
    variant: selectedVariant,
    autoFillPrice: false,
  });

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedVariant || !calculation.isValid) return;

    addItem({
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantName: selectedVariant.name,
      quantity: calculation.quantity.toString(),
      unitCost: calculation.unitPrice.toString(),
      totalCost: calculation.subtotal.toString(),
    });

    setSelectedProductId(null);
    setSelectedVariantId(null);
    handleClear();
    
    if (onAddedToCart) {
      onAddedToCart();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div className="space-y-2">
          <label className="text-sm font-medium">Producto</label>
          <div className="grid grid-cols-2 gap-2">
            {products.filter(p => p.isActive).map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  setSelectedProductId(product.id);
                  setSelectedVariantId(null);
                  handleClear();
                }}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-colors",
                  selectedProductId === product.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-200"
                )}
              >
                <p className="font-medium text-sm">{product.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {product.unit === "kg" ? "Por kilo" : "Por unidad"}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {selectedProduct && variants.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Presentación</label>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    handleClear();
                  }}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-colors",
                    selectedVariantId === variant.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-orange-200"
                  )}
                >
                  <p className="font-medium text-sm">{variant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Costo: S/ {formatCurrency(parseFloat(variant.price || "0"))}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedVariant && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <CalculatorIcon className="h-5 w-5 text-orange-600" />
              <span className="font-medium">Calculadora de Costo</span>
            </div>

            {isKgProduct ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Tara (kg)</label>
                  <Input
                    {...form.register("tara")}
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Kilos netos</label>
                  <Input
                    {...form.register("kilos")}
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Costo por kg (S/)</label>
                  <Input
                    {...form.register("pricePerKg")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Total (S/)</label>
                  <Input
                    {...form.register("totalAmount")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Packs</label>
                    <Input
                      {...form.register("packs")}
                      type="number"
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Unidades sueltas</label>
                    <Input
                      {...form.register("units")}
                      type="number"
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Costo por pack (S/)</label>
                  <Input
                    {...form.register("pricePerPack")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Total (S/)</label>
                  <Input
                    {...form.register("totalAmount")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            {calculation.isValid && (
              <div className="p-4 bg-orange-50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cantidad:</span>
                  <span className="font-medium">
                    {isKgProduct
                      ? `${formatKilos(calculation.quantity)} kg`
                      : `${Math.round(calculation.quantity)} unidades`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Costo unitario:</span>
                  <span className="font-medium">S/ {formatCurrency(calculation.unitPrice)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-orange-200">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-bold text-lg">S/ {formatCurrency(calculation.subtotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedVariant && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button
            onClick={handleAddToCart}
            disabled={!isValid}
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar al carrito · S/ {formatCurrency(calculation.subtotal)}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedProductId(null);
              setSelectedVariantId(null);
              handleClear();
            }}
            className="w-full h-12 rounded-xl"
          >
            Limpiar
          </Button>
        </div>
      )}
    </div>
  );
}

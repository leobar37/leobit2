import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVariantsByProduct, type ProductVariant } from "~/hooks/use-product-variants";
import type { Product } from "~/hooks/use-products";

interface ProductVariantSelectorProps {
  products: Product[];
  onAddItem: (
    variant: ProductVariant,
    product: Product | undefined,
    cantidad: number
  ) => void;
}

export function ProductVariantSelector({
  products,
  onAddItem,
}: ProductVariantSelectorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<string>("");

  const { data: variants } = useVariantsByProduct(selectedProductId || "", {
    isActive: true,
  });

  // Performance fix: useMemo for filtered arrays
  const filteredProducts = useMemo(
    () => products?.filter((p) => p.isActive) || [],
    [products]
  );

  const activeVariants = useMemo(
    () => variants?.filter((v) => v.isActive) || [],
    [variants]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const selectedVariant = useMemo(
    () => activeVariants.find((v) => v.id === selectedVariantId),
    [activeVariants, selectedVariantId]
  );

  const handleAdd = () => {
    if (selectedVariant && parseFloat(cantidad) > 0) {
      onAddItem(selectedVariant, selectedProduct, parseFloat(cantidad));
      setSelectedProductId(null);
      setSelectedVariantId(null);
      setCantidad("");
    }
  };

  const handleProductChange = (value: string) => {
    setSelectedProductId(value || null);
    setSelectedVariantId(null);
  };

  return (
    <div className="space-y-3 p-4 border rounded-xl bg-gray-50/50">
      <div className="space-y-2">
        <Label className="text-sm">Producto</Label>
        <select
          value={selectedProductId || ""}
          onChange={(e) => handleProductChange(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-input bg-white"
        >
          <option value="">Seleccionar producto</option>
          {filteredProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProductId && (
        <div className="space-y-2">
          <Label className="text-sm">Variante</Label>
          <select
            value={selectedVariantId || ""}
            onChange={(e) => setSelectedVariantId(e.target.value || null)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-white"
          >
            <option value="">Seleccionar variante</option>
            {activeVariants?.length === 0 && (
              <option value="" disabled>No hay variantes disponibles</option>
            )}
            {activeVariants?.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
                {variant.inventory
                  ? ` (Stock: ${parseFloat(variant.inventory.quantity).toFixed(1)} kg)`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedVariantId && (
        <div className="space-y-2">
          <Label className="text-sm">Cantidad (kg)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Ej: 25"
              className="rounded-xl bg-white"
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!cantidad || parseFloat(cantidad) <= 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {selectedVariant?.inventory && (
            <p className="text-xs text-muted-foreground">
              Disponible:{" "}
              {parseFloat(selectedVariant.inventory.quantity).toFixed(1)} kg
            </p>
          )}
        </div>
      )}
    </div>
  );
}

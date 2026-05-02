/**
 * Distribucion Item Selector
 * Modal for selecting product variants to add to a distribucion
 */

import { useState, useMemo } from "react";
import { Package, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "~/lib/utils";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import type { CreateDistribucionItemInput } from "~/hooks/use-distribuciones";

interface DistribucionItemSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: CreateDistribucionItemInput) => void;
  excludeVariantIds?: string[];
}

export function DistribucionItemSelector({
  open,
  onOpenChange,
  onSelect,
  excludeVariantIds = [],
}: DistribucionItemSelectorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products } = useProducts();
  const { data: variants } = useVariantsByProduct(selectedProductId || "", {
    isActive: true,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const selectedProduct = useMemo(
    () => products?.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const availableVariants = useMemo(() => {
    if (!variants) return [];
    return variants.filter((v) => !excludeVariantIds.includes(v.id));
  }, [variants, excludeVariantIds]);

  const selectedVariant = useMemo(
    () => availableVariants.find((v) => v.id === selectedVariantId),
    [availableVariants, selectedVariantId]
  );

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedVariantId(null);
    setCantidad("");
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    setCantidad("");
  };

  const handleAdd = () => {
    if (selectedVariant && parseFloat(cantidad) > 0) {
      onSelect({
        variantId: selectedVariant.id,
        cantidadAsignada: parseFloat(cantidad),
        unidad: "kg",
      });
      reset();
      onOpenChange(false);
    }
  };

  const reset = () => {
    setSelectedProductId(null);
    setSelectedVariantId(null);
    setCantidad("");
    setSearchQuery("");
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <AppDrawer open={open} onOpenChange={handleClose} size="large">
      <AppDrawer.Header
        title="Agregar Producto"
        icon={<Package className="h-5 w-5" />}
        onClose={handleClose}
      />

      <AppDrawer.Body className="space-y-4">
        {!selectedProductId ? (
          // Product selection
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="shell-search-field pl-9 pr-4"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No se encontraron productos
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                      "border-border bg-card hover:bg-accent"
                    )}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/80 dark:bg-orange-500/14">
                      <Package className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Toca para ver variantes
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          // Variant selection
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(null);
                setSelectedVariantId(null);
                setCantidad("");
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              ← Volver a productos
            </button>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Variantes de {selectedProduct?.name}
              </p>
              {availableVariants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay variantes disponibles
                </p>
              ) : (
                availableVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => handleVariantSelect(variant.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                        selectedVariantId === variant.id
                          ? "border-orange-300 bg-orange-50 dark:border-orange-400/30 dark:bg-orange-500/12"
                          : "border-border bg-card hover:bg-accent"
                      )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{variant.name}</p>
                    </div>
                    {selectedVariantId === variant.id && (
                      <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <Plus className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {selectedVariant && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm font-medium">Cantidad a asignar (kg)</p>
                <div className="flex gap-2">
                  <NumericInput
                    decimals={1}
                    min="0.1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="Ej: 25"
                    className="rounded-xl flex-1"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAdd}
                    disabled={!cantidad || parseFloat(cantidad) <= 0}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </AppDrawer.Body>
    </AppDrawer>
  );
}

import { useMemo, useState } from "react";
import { Plus, Package, X, ChevronDown } from "lucide-react";
import { formatKilos } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NumericInput } from "@/components/ui/numeric-input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { Input } from "@/components/ui/input";
import { useVariantsByProduct, type ProductVariant } from "~/hooks/use-product-variants";
import type { Product } from "~/hooks/use-products";
import { cn } from "~/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: variants } = useVariantsByProduct(selectedProductId || "", {
    isActive: true,
  });

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
      setIsOpen(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedVariantId(null);
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  const filteredProductsSearch = filteredProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayText = selectedVariant
    ? `${selectedProduct?.name || ""} - ${selectedVariant.name}`
    : selectedProduct
      ? selectedProduct.name
      : "Agregar Productos";

  return (
    <>
      <Card
        className="shell-card cursor-pointer rounded-3xl border-0 transition-colors hover:bg-white/90"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shell-card-muted flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100/80">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{displayText}</p>
                {!selectedProduct && (
                  <p className="text-sm text-muted-foreground">
                    Toca para seleccionar
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedVariant && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductId(null);
                    setSelectedVariantId(null);
                    setCantidad("");
                  }}
                  className="rounded-2xl text-muted-foreground hover:bg-white/70 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-2xl text-muted-foreground hover:bg-white/70 hover:text-foreground",
                  isOpen && "bg-orange-100 text-orange-700",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppDrawer open={isOpen} onOpenChange={setIsOpen} size="large">
        <AppDrawer.Header
          title="Agregar Producto"
          icon={<Package className="h-5 w-5" />}
          onClose={() => setIsOpen(false)}
        />

        <AppDrawer.Body className="space-y-4">
          <Input
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl"
          />

          {!selectedProductId ? (
            <div className="space-y-2">
              {filteredProductsSearch.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No se encontraron productos
                </p>
              ) : (
                filteredProductsSearch.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                      "border-white/70 bg-white/60 hover:bg-white/82",
                    )}
                  >
                    <div className="shell-card-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/80">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Toca para ver variantes
                      </p>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedProductId(null);
                  setSelectedVariantId(null);
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
                Volver a productos
              </button>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Variantes de {selectedProduct?.name}
                </p>
                {activeVariants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay variantes disponibles
                  </p>
                ) : (
                  activeVariants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleVariantSelect(variant.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                        selectedVariantId === variant.id
                          ? "shell-card-muted border-orange-300 bg-orange-50/90"
                          : "border-white/70 bg-white/60 hover:bg-white/82",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{variant.name}</p>
                        {variant.inventory && (
                          <p className="text-sm text-muted-foreground">
                            Stock: {formatKilos(variant.inventory.quantity, 1)} kg
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedVariantId && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium">Cantidad (kg)</p>
                  <div className="flex gap-2">
                    <NumericInput
                      decimals={1}
                      min="0.1"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      placeholder="Ej: 25"
                      className="rounded-xl bg-white flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAdd}
                      disabled={!cantidad || parseFloat(cantidad) <= 0}
                      className="bg-orange-500 hover:bg-orange-600 h-10 px-4"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  {selectedVariant?.inventory && (
                    <p className="text-xs text-muted-foreground">
                      Disponible: {formatKilos(selectedVariant.inventory.quantity, 1)} kg
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </AppDrawer.Body>
      </AppDrawer>
    </>
  );
}

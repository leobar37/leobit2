// @ts-nocheck - Route file with complex type errors
import { useState } from "react";
import { Package, Search, Plus } from "lucide-react";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProducts } from "~/hooks/use-products-live";
import { useProductCategories } from "~/hooks/use-product-categories";
import { useListSearch } from "~/hooks/use-list-search";
import { ProductCard } from "@/components/products/product-card";
import {
  CategoryManager,
  CategoryManagerTrigger,
} from "@/components/products/category-manager";
import { useSetLayout } from "~/components/layout/app-layout";
import { MobileShell } from "~/components/mobile";
import { cn } from "~/lib/utils";
import { getCategoryColor } from "~/lib/utils/category-colors";

export default function ProductsPage() {
  useSetLayout({ title: "Productos e inventario" });

  const { data: products, isLoading, error } = useProducts();
  const { data: categories } = useProductCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | "uncategorized" | null
  >(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const {
    filteredItems: searchFilteredProducts,
    search,
    setSearch,
  } = useListSearch({
    items: products,
    searchFields: [(product) => product.name],
  });

  const filteredProducts = searchFilteredProducts.filter((product) => {
    if (selectedCategoryId === null) return true;
    if (selectedCategoryId === "uncategorized") return !product.categoryId;
    return product.categoryId === selectedCategoryId;
  });

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="shell-search-field pl-11 pr-4"
          />
        </div>

        <div className="flex items-center justify-between border-b border-border/60 pb-2 dark:border-white/[0.07]">
          <CategoryManagerTrigger onClick={() => setManagerOpen(true)} />
        </div>

        {categories && categories.length > 0 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
            <button
              data-testid="products-category-filter-chip"
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                selectedCategoryId === null
                  ? "bg-orange-500 text-white"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                data-testid="products-category-filter-chip"
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedCategoryId === category.id
                    ? "text-white"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
                style={
                  selectedCategoryId === category.id
                    ? { backgroundColor: getCategoryColor(category.color) }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getCategoryColor(category.color) }}
                />
                {category.name}
              </button>
            ))}
            <button
              data-testid="products-category-filter-chip"
              type="button"
              onClick={() => setSelectedCategoryId("uncategorized")}
              className={cn(
                "flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                selectedCategoryId === "uncategorized"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <span className="h-2 w-2 rounded-full border border-muted-foreground bg-transparent" />
              Sin categoría
            </button>
          </div>
        )}

        {isLoading && (
          <div className="py-8 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Cargando productos...</p>
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-red-500">Error al cargar productos</p>
          </div>
        )}

        {filteredProducts?.length === 0 && !isLoading && (
          <div className="py-8 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search
                ? "No se encontraron productos"
                : "No hay productos registrados"}
            </p>
          </div>
        )}

        <div>
          {filteredProducts?.map((product) => (
            <Link
              key={product.id}
              to={`/productos/${product.id}`}
              className="block"
            >
              <ProductCard product={product} />
            </Link>
          ))}
        </div>
      </div>

      <MobileShell.FloatingAction>
        <Button
          size="icon"
          asChild
          className="h-12 w-12 rounded-xl bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.2)] hover:bg-orange-600"
        >
          <Link to="/productos/nuevo" aria-label="Nuevo producto">
            <Plus className="h-6 w-6" />
          </Link>
        </Button>
      </MobileShell.FloatingAction>

      <CategoryManager open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}

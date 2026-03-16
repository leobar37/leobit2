import { Package, Search, Plus } from "lucide-react";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SyncStatus } from "~/components/sync/sync-status";
import { useProducts } from "~/hooks/use-products-live";
import { useListSearch } from "~/hooks/use-list-search";
import { ProductCard } from "~/components/products/product-card";
import { useSetLayout } from "~/components/layout/app-layout";

export default function ProductsPage() {
  useSetLayout({ title: "Catálogo", actions: <SyncStatus /> });

  const { data: products, isLoading, error } = useProducts();

  const { filteredItems: filteredProducts, search, setSearch } = useListSearch({
    items: products,
    searchFields: [
      (product) => product.name,
      (product) => product.type,
    ],
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
            className="shell-field h-12 rounded-[20px] pl-11 pr-4 placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
          />
        </div>

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
              {search ? "No se encontraron productos" : "No hay productos registrados"}
            </p>
          </div>
        )}

        <div className="space-y-3">
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

      <Button
        size="icon"
        asChild
        className="fixed right-4 bottom-28 z-50 h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
      >
        <Link to="/productos/nuevo" aria-label="Nuevo producto">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </>
  );
}

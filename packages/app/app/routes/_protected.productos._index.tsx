import { Package, Search, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SyncStatus } from "~/components/sync/sync-status";
import { useProducts } from "~/hooks/use-products-live";
import { ProductCard } from "~/components/products/product-card";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading, error } = useProducts();

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.type.includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-3 sm:px-4">
          <h1 className="font-bold text-lg">Catálogo</h1>
          <div className="flex items-center gap-2">
            <Link to="/productos/nuevo">
              <Button className="bg-orange-500 hover:bg-orange-600 rounded-xl">
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            </Link>
            <SyncStatus />
          </div>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-24">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Cargando productos...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">Error al cargar productos</p>
            </div>
          )}

          {filteredProducts?.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </div>
          )}

          <div className="grid gap-3">
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
      </main>
    </div>
  );
}

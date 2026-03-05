import { Link, useNavigate } from "react-router";
import { ArrowLeft, Package, ShoppingCart, AlertCircle } from "lucide-react";
import { useMissingInventory } from "~/hooks/use-missing-inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ComprasSugeridasPage() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useMissingInventory();

  const itemsNeedingPurchase = items?.filter((item) => parseFloat(item.needed) > 0) || [];
  const totalNeeded = itemsNeedingPurchase.reduce(
    (sum, item) => sum + parseFloat(item.needed),
    0
  );

  const handleCreatePurchase = () => {
    navigate("/compras/nueva");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-bold text-lg">Compras Sugeridas</h1>
          </div>
          {itemsNeedingPurchase.length > 0 && (
            <Button
              onClick={handleCreatePurchase}
              className="bg-orange-500 hover:bg-orange-600"
              size="sm"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Crear Compra
            </Button>
          )}
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        {/* Summary Card */}
        <Card className="border-orange-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {isLoading ? (
                    <span className="inline-block h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    itemsNeedingPurchase.length
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Productos faltantes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {isLoading ? (
                    <span className="inline-block h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    `${totalNeeded.toFixed(2)}`
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total necesario</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">
            Detalle por producto
          </h2>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-orange-100">
                <CardContent className="p-4">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))
          ) : itemsNeedingPurchase.length === 0 ? (
            <Card className="border-orange-100">
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium text-lg mb-1">Todo en orden</h3>
                <p className="text-sm text-muted-foreground">
                  No hay productos que necesiten ser comprados. Tu inventario cubre todas las ventas.
                </p>
              </CardContent>
            </Card>
          ) : (
            itemsNeedingPurchase.map((item) => (
              <Card key={`${item.productId}-${item.variantId}`} className="border-orange-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{item.productName}</h3>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      )}
                    </div>
                    <Badge variant="destructive" className="bg-orange-500">
                      Falta: {parseFloat(item.needed).toFixed(2)}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-muted-foreground">Vendido</p>
                      <p className="font-medium">{parseFloat(item.totalSold).toFixed(2)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-muted-foreground">En Stock</p>
                      <p className="font-medium">{parseFloat(item.currentStock).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info Card */}
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm text-blue-900">¿Cómo funciona?</h4>
              <p className="text-sm text-blue-700 mt-1">
                Este reporte compara lo que has vendido con tu inventario actual. 
                Si vendiste más de lo que tienes en stock, te sugerimos comprar la diferencia.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

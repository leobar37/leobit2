import { Link } from "react-router";
import { ArrowLeft, Package, TrendingUp, AlertCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryCard } from "~/components/inventory/inventory-card";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { useBusiness } from "~/hooks/use-business";
import { formatKilos, formatCurrency } from "~/lib/utils";

export default function MiDistribucionPage() {
  const { data: distribucion, isLoading, error } = useMiDistribucion();
  const { data: business } = useBusiness();

  const usarDistribucion = business?.usarDistribucion ?? true;

  if (!usarDistribucion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
          <div className="flex items-center h-16 px-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Mi Distribución</h1>
          </div>
        </header>

        <main className="p-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Modo Libre</h2>
              <p className="text-muted-foreground">
                Tu negocio no utiliza control de distribución. Puedes registrar ventas sin asignación de kilos.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
          <div className="flex items-center h-16 px-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Mi Distribución</h1>
          </div>
        </header>

        <main className="p-4">
          <div className="text-center py-8">Cargando...</div>
        </main>
      </div>
    );
  }

  if (error || !distribucion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
          <div className="flex items-center h-16 px-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Mi Distribución</h1>
          </div>
        </header>

        <main className="p-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Sin Asignación</h2>
              <p className="text-muted-foreground mb-4">
                No tienes una distribución asignada para hoy.
              </p>
              <p className="text-sm text-muted-foreground">
                Contacta a tu administrador para que te asigne kilos.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const kilosDisponibles =
    distribucion.kilosAsignados - distribucion.kilosVendidos;
  const isCerrado = distribucion.estado === "cerrado";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Mi Distribución</h1>
          </div>
          {isCerrado && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Cerrado
            </span>
          )}
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        <InventoryCard
          kilosAsignados={distribucion.kilosAsignados}
          kilosVendidos={distribucion.kilosVendidos}
          puntoVenta={distribucion.puntoVenta}
        />

        {distribucion.items && distribucion.items.length > 0 && (
          <Card className="border-0 shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Productos Asignados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {distribucion.items.map((item) => {
                const cantidadDisponible = item.cantidadAsignada - item.cantidadVendida;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.variant?.product?.name || "Producto"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.variant?.name || "Variante"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-orange-600">
                          {formatKilos(cantidadDisponible)} {item.unidad}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          de {formatKilos(item.cantidadAsignada)} {item.unidad}
                        </p>
                      </div>
                      {item.cantidadVendida > 0 && (
                        <Badge variant="secondary" className="bg-white text-xs">
                          {Math.round((item.cantidadVendida / item.cantidadAsignada) * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumen del Día
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <span className="text-2xl font-bold text-orange-600">
                  {formatKilos(distribucion.kilosAsignados)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Kg Asignados</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <span className="text-2xl font-bold text-green-600">
                  {formatKilos(kilosDisponibles)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Kg Disponibles</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monto Recaudado</span>
                <span className="text-lg font-semibold">
                  S/ {formatCurrency(distribucion.montoRecaudado)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isCerrado && (
          <Link to="/ventas/nueva">
            <Button className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600">
              <Package className="mr-2 h-5 w-5" />
              Nueva Venta
            </Button>
          </Link>
        )}
      </main>
    </div>
  );
}

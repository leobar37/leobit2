import { Link } from "react-router";
import { ArrowLeft, Package, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryCard } from "~/components/inventory/inventory-card";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { useBusiness } from "~/hooks/use-business";

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
                  {distribucion.kilosAsignados.toFixed(1)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Kg Asignados</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <span className="text-2xl font-bold text-green-600">
                  {kilosDisponibles.toFixed(1)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Kg Disponibles</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monto Recaudado</span>
                <span className="text-lg font-semibold">
                  S/ {distribucion.montoRecaudado.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isCerrado && (
          <Link to="/sales/new">
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

import { Link } from "react-router";
import {
  ShoppingCart,
  Users,
  Calculator,
  Package,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InventoryCard } from "~/components/inventory/inventory-card";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: distribucion } = useMiDistribucion();

  const usarDistribucion = business?.usarDistribucion ?? true;
  const tieneDistribucion = !!distribucion;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Hola, {user?.name?.split(" ")[0]}! 👋</CardTitle>
          <CardDescription className="text-orange-100">
            Bienvenido de vuelta a tu sistema de ventas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-100">
            Usa el menu inferior para navegar entre las diferentes funciones del sistema.
          </p>
        </CardContent>
      </Card>

      {usarDistribucion && tieneDistribucion && (
        <Link to="/mi-distribucion">
          <InventoryCard
            kilosAsignados={distribucion.kilosAsignados}
            kilosVendidos={distribucion.kilosVendidos}
            puntoVenta={distribucion.puntoVenta}
          />
        </Link>
      )}

      {usarDistribucion && !tieneDistribucion && (
        <Card className="border-0 shadow-md rounded-2xl bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">Sin distribucion asignada</p>
              <p className="text-sm text-amber-700">Contacta a tu administrador</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Link to="/ventas">
          <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center"
            >
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
            <p className="font-semibold text-foreground">Nueva Venta</p>
          </Card>
        </Link>

        <Link to="/clientes">
          <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center"
            >
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <p className="font-semibold text-foreground">Clientes</p>
          </Card>
        </Link>

        <Link to="/calculadora">
          <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3"
          >
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center"
            >
              <Calculator className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-semibold text-foreground">Calculadora</p>
          </Card>
        </Link>

        <Link to="/cierre">
          <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center"
            >
              <Calculator className="h-6 w-6 text-purple-600" />
            </div>
            <p className="font-semibold text-foreground">Reportes</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

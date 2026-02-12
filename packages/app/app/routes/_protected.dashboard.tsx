import { Link } from "react-router";
import {
  Home,
  ShoppingCart,
  Users,
  Calculator,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const menuItems = [
  { icon: Home, label: "Inicio", href: "/dashboard" },
  { icon: ShoppingCart, label: "Ventas", href: "/sales" },
  { icon: Users, label: "Clientes", href: "/customers" },
  { icon: Calculator, label: "Calculadora", href: "/calculator" },
  { icon: Settings, label: "Configuración", href: "/settings" },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-lg text-foreground">Avileo</span>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <User className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Perfil</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">¡Hola, {user?.name?.split(" ")[0]}! 👋</CardTitle>
              <CardDescription className="text-orange-100">
                Bienvenido de vuelta a tu sistema de ventas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-100">
                Usa el menú inferior para navegar entre las diferentes funciones del sistema.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Link to="/sales">
              <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center"
                >
                  <ShoppingCart className="h-6 w-6 text-orange-600" />
                </div>
                <p className="font-semibold text-foreground">Nueva Venta</p>
              </Card>
            </Link>

            <Link to="/customers">
              <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center"
                >
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-semibold text-foreground">Clientes</p>
              </Card>
            </Link>

            <Link to="/calculator">
              <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center"
                >
                  <Calculator className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-semibold text-foreground">Calculadora</p>
              </Card>
            </Link>

            <Link to="/reports">
              <Card className="border-0 shadow-md rounded-3xl hover:shadow-lg transition-shadow cursor-pointer h-32 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center"
                >
                  <Home className="h-6 w-6 text-purple-600" />
                </div>
                <p className="font-semibold text-foreground">Reportes</p>
              </Card>
            </Link>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-orange-100 px-4 py-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

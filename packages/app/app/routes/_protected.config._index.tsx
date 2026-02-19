import { Link } from "react-router";
import {
  User,
  Users,
  Package,
  CreditCard,
  Store,
  ChevronRight,
  Shield,
  Bell,
  Moon,
  Truck,
  ShoppingCart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";

interface ConfigItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  color: string;
  iconBg: string;
}

const baseConfigItems: ConfigItem[] = [
  {
    icon: User,
    title: "Mi Perfil",
    description: "Editar datos personales y foto",
    href: "/profile",
    color: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  {
    icon: Store,
    title: "Mi Negocio",
    description: "Configuración general del negocio",
    href: "/business/edit",
    color: "text-orange-600",
    iconBg: "bg-orange-100",
  },
  {
    icon: Package,
    title: "Inventario",
    description: "Gestiona tus productos y stock",
    href: "/productos",
    color: "text-green-600",
    iconBg: "bg-green-100",
  },
  {
    icon: CreditCard,
    title: "Métodos de Pago",
    description: "Yape, Plin, transferencias",
    href: "/config/payment-methods",
    color: "text-purple-600",
    iconBg: "bg-purple-100",
  },
  {
    icon: Bell,
    title: "Notificaciones",
    description: "Alertas y recordatorios",
    href: "/config/notifications",
    color: "text-yellow-600",
    iconBg: "bg-yellow-100",
  },
  {
    icon: Moon,
    title: "Apariencia",
    description: "Tema y colores",
    href: "/config/appearance",
    color: "text-indigo-600",
    iconBg: "bg-indigo-100",
  },
  {
    icon: Shield,
    title: "Seguridad",
    description: "Cambiar contraseña",
    href: "/config/security",
    color: "text-red-600",
    iconBg: "bg-red-100",
  },
];

const teamConfigItem: ConfigItem = {
  icon: Users,
  title: "Mi Equipo",
  description: "Gestiona vendedores e invitaciones",
  href: "/team",
  color: "text-teal-600",
  iconBg: "bg-teal-100",
};

const distribucionesConfigItem: ConfigItem = {
  icon: Truck,
  title: "Distribuciones",
  description: "Asigna inventario a vendedores",
  href: "/distribuciones",
  color: "text-amber-600",
  iconBg: "bg-amber-100",
};

const comprasConfigItem: ConfigItem = {
  icon: ShoppingCart,
  title: "Compras",
  description: "Gestiona compras y proveedores",
  href: "/compras",
  color: "text-cyan-600",
  iconBg: "bg-cyan-100",
};

export default function ConfigIndexPage() {
  const { user } = useAuth();
  const { data: business } = useBusiness();

  const isAdmin = business?.role === "ADMIN_NEGOCIO";

  const configItems = isAdmin
    ? [
        baseConfigItems[0],
        baseConfigItems[1],
        teamConfigItem,
        distribucionesConfigItem,
        comprasConfigItem,
        ...baseConfigItems.slice(2),
      ]
    : baseConfigItems;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Menú</CardTitle>
          <CardDescription className="text-orange-100">
            Todas las opciones de la aplicación
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {configItems.map((item) => (
          <Link key={item.href} to={item.href} className="block">
            <Card className="border-0 shadow-md rounded-2xl hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className={`w-12 h-12 ${item.iconBg} rounded-2xl flex items-center justify-center shrink-0`}
                >
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-orange-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Sesión iniciada como {user?.email}
        </p>
      </div>
    </div>
  );
}

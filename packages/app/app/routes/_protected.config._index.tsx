// @ts-nocheck - Route file with complex type errors
import { Link } from "react-router";
import {
  User,
  Users,
  Package,
  CreditCard,
  Store,
  ChevronRight,
  Shield,
  Truck,
  ShoppingCart,
  Flag,
  MessageCircle,
  Tag,
  UserCog,
  MapPin,
  Building2,
  AlertTriangle,
  ImageIcon,
  ReceiptText,
  CarFront,
  MapPinned,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";

import { type LucideIcon } from "lucide-react";

interface ConfigItem {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  color: string;
}

const baseConfigItems: ConfigItem[] = [
  {
    icon: User,
    title: "Mi Perfil",
    description: "Editar datos personales y foto",
    href: "/profile",
    color: "text-blue-600",
  },
  {
    icon: Store,
    title: "Mi Negocio",
    description: "Configuración general del negocio",
    href: "/business/edit",
    color: "text-orange-600",
  },
  {
    icon: Package,
    title: "Inventario",
    description: "Gestiona tus productos y stock",
    href: "/productos",
    color: "text-green-600",
  },
  {
    icon: CreditCard,
    title: "Métodos de Pago",
    description: "Yape, Plin, transferencias",
    href: "/config/payment-methods",
    color: "text-purple-600",
  },
  {
    icon: Shield,
    title: "Seguridad",
    description: "Cambiar contraseña",
    href: "/config/security",
    color: "text-red-600",
  },
];

const teamConfigItem: ConfigItem = {
  icon: Users,
  title: "Mi Equipo",
  description: "Gestiona vendedores e invitaciones",
  href: "/team",
  color: "text-teal-600",
};

const distribucionesConfigItem: ConfigItem = {
  icon: Truck,
  title: "Distribuciones",
  description: "Asigna inventario a vendedores",
  href: "/distribuciones",
  color: "text-amber-600",
};

const comprasConfigItem: ConfigItem = {
  icon: ShoppingCart,
  title: "Compras",
  description: "Gestiona compras y proveedores",
  href: "/compras",
  color: "text-cyan-600",
};

const gastosConfigItem: ConfigItem = {
  icon: ReceiptText,
  title: "Gastos",
  description: "Registra gastos generales sin distribución",
  href: "/gastos",
  color: "text-rose-600",
};

const flagsConfigItem: ConfigItem = {
  icon: Flag,
  title: "Flags",
  description: "Configuración de calculadoras y features",
  href: "/config/flags",
  color: "text-pink-600",
};

const tagsConfigItem: ConfigItem = {
  icon: Tag,
  title: "Etiquetas",
  description: "Gestiona etiquetas para clientes",
  href: "/config/tags",
  color: "text-indigo-600",
  iconBg: "bg-indigo-100",
};

const puntosVentaConfigItem: ConfigItem = {
  icon: MapPin,
  title: "Puntos de Venta",
  description: "Gestiona puntos de venta para distribuciones",
  href: "/config/puntos-venta",
  color: "text-orange-600",
  iconBg: "bg-orange-100",
};

const waterRoutesConfigItem: ConfigItem = {
  icon: MapPinned,
  title: "Rutas de Agua",
  description: "Gestiona rutas formales para clientes y entregas",
  href: "/config/water-routes",
  color: "text-sky-600",
  iconBg: "bg-sky-100",
};

const proveedoresConfigItem: ConfigItem = {
  icon: Building2,
  title: "Proveedores",
  description: "Gestiona proveedores y contactos",
  href: "/proveedores",
  color: "text-amber-600",
  iconBg: "bg-amber-100",
};

const gruposConfigItem: ConfigItem = {
  icon: UserCog,
  title: "Grupos",
  description: "Gestiona grupos de clientes",
  href: "/grupos",
  color: "text-amber-600",
};

const whatsappConfigItem: ConfigItem = {
  icon: MessageCircle,
  title: "WhatsApp",
  description: "Conecta WhatsApp para notificaciones",
  href: "/config/whatsapp",
  color: "text-green-600",
  iconBg: "bg-green-100",
};

const stockAlertsConfigItem: ConfigItem = {
  icon: AlertTriangle,
  title: "Alertas de Stock",
  description: "Productos con stock bajo o crítico",
  href: "/reportes/alertas-stock",
  color: "text-red-600",
  iconBg: "bg-red-100",
};

const activosConfigItem: ConfigItem = {
  icon: ImageIcon,
  title: "Activos",
  description: "Galería de imágenes para productos",
  href: "/activos",
  color: "text-pink-600",
  iconBg: "bg-pink-100",
};

const cocheraConfigItem: ConfigItem = {
  icon: CarFront,
  title: "Configuración de Cochera",
  description: "Tarifas, plazas y métodos de pago",
  href: "/config/cochera",
  color: "text-emerald-600",
  iconBg: "bg-emerald-100",
};

export default function ConfigIndexPage() {
  const { user } = useAuth();
  const { data: business } = useBusiness();

  const isAdmin = business?.role === "ADMIN_NEGOCIO";
  const isCocheraMode = business?.businessMode === "cochera";
  const isWaterMode = business?.businessMode === "agua";

  const configItems = isAdmin
    ? [
        baseConfigItems[0],
        baseConfigItems[1],
        teamConfigItem,
        ...(isCocheraMode ? [cocheraConfigItem] : [distribucionesConfigItem, comprasConfigItem]),
        ...(isCocheraMode ? [] : [gastosConfigItem]),
        ...(isCocheraMode ? [] : [stockAlertsConfigItem]),
        ...(isCocheraMode ? [] : [activosConfigItem]),
        ...(isWaterMode ? [waterRoutesConfigItem] : []),
        ...(isCocheraMode ? [] : [puntosVentaConfigItem]),
        ...(isCocheraMode ? [] : [proveedoresConfigItem]),
        ...(isCocheraMode ? [] : [gruposConfigItem]),
        ...(isCocheraMode ? [] : [tagsConfigItem]),
        ...(isCocheraMode ? [] : [flagsConfigItem]),
        ...(isCocheraMode ? [] : [whatsappConfigItem]),
        ...baseConfigItems.slice(2),
      ]
    : [...baseConfigItems, ...(isCocheraMode ? [] : [gastosConfigItem, activosConfigItem])];

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
          Menú
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Todas las opciones de la aplicación
        </p>
      </div>

      <div className="divide-y divide-border/70 border-y border-border/70">
        {configItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="group flex items-center gap-3 py-3.5 transition-colors hover:bg-muted/25"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted/35 ring-1 ring-border/60 dark:bg-white/[0.035] dark:ring-white/8">
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-foreground">
                {item.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">
                {item.description}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
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

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
} from "lucide-react";
import {
  MinimalCardTitle,
  MinimalCardDescription,
} from "~/components/cards";
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

  const configItems = isAdmin
    ? [
        baseConfigItems[0],
        baseConfigItems[1],
        teamConfigItem,
        ...(isCocheraMode ? [cocheraConfigItem] : [distribucionesConfigItem, comprasConfigItem]),
        ...(isCocheraMode ? [] : [gastosConfigItem]),
        ...(isCocheraMode ? [] : [stockAlertsConfigItem]),
        ...(isCocheraMode ? [] : [activosConfigItem]),
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

      <div className="space-y-3">
        {configItems.map((item) => (
          <Link key={item.href} to={item.href} className="block">
            <div className="shell-card-flat flex items-center gap-4 rounded-[24px] border border-border/70 bg-card/90 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-colors hover:border-orange-200/70 hover:bg-card dark:border-white/6 dark:bg-[#1d2028] dark:shadow-[0_14px_34px_rgba(0,0,0,0.24)] dark:hover:border-white/12 dark:hover:bg-[#232631]">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-muted/80 ring-1 ring-border/70 dark:bg-white/[0.04] dark:ring-white/8">
                <item.icon className={`h-7 w-7 ${item.color}`} />
              </div>
              <div className="min-w-0 flex-1 pr-2">
                <MinimalCardTitle className="text-[1.1rem] font-semibold tracking-[-0.03em]">
                  {item.title}
                </MinimalCardTitle>
                <MinimalCardDescription className="mt-1 text-[0.98rem] leading-snug text-muted-foreground/90">
                  {item.description}
                </MinimalCardDescription>
              </div>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground ring-1 ring-border/70 dark:bg-white/[0.04] dark:text-white/45 dark:ring-white/6">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
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

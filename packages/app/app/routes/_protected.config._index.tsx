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
} from "lucide-react";
import {
  MinimalCard,
  MinimalCardContent,
  MinimalCardTitle,
  MinimalCardDescription,
  MinimalCardMedia,
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
  href: "/tags",
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

const conflictosConfigItem: ConfigItem = {
  icon: AlertTriangle,
  title: "Conflictos",
  description: "Resuelve conflictos de sincronización",
  href: "/config/conflictos",
  color: "text-orange-600",
  iconBg: "bg-orange-100",
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
        puntosVentaConfigItem,
        proveedoresConfigItem,
        gruposConfigItem,
        tagsConfigItem,
        flagsConfigItem,
        whatsappConfigItem,
        conflictosConfigItem,
        ...baseConfigItems.slice(2),
      ]
    : baseConfigItems;

  return (
    <div className="space-y-6">
      {/* Header - Sin fondo, solo texto */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-foreground">Menú</h1>
        <p className="text-base text-muted-foreground mt-1">
          Todas las opciones de la aplicación
        </p>
      </div>

      {/* Lista de opciones */}
      <div className="space-y-3">
        {configItems.map((item) => (
          <Link key={item.href} to={item.href} className="block">
            <MinimalCard 
              variant="outlined" 
              interactive 
              clickable 
              radius="md"
              className="flex items-center gap-4"
            >
              <MinimalCardMedia icon={item.icon} iconColor={item.color} size="md" />
              <MinimalCardContent>
                <MinimalCardTitle className="text-base font-medium">
                  {item.title}
                </MinimalCardTitle>
                <MinimalCardDescription>
                  {item.description}
                </MinimalCardDescription>
              </MinimalCardContent>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </MinimalCard>
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

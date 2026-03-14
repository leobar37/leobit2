import { cn } from "~/lib/utils";

type SaleStatus = "draft" | "confirmed" | "active" | "delivered" | "cancelled";
type SaleType = "instant_sale" | "pre_order";

interface SaleStatusBadgeProps {
  status: SaleStatus;
  type: SaleType;
  className?: string;
}

const statusConfig: Record<
  SaleStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Borrador",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  confirmed: {
    label: "Confirmado",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  active: {
    label: "Completado",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  delivered: {
    label: "Entregado",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export function SaleStatusBadge({
  status,
  type,
  className,
}: SaleStatusBadgeProps) {
  const config = statusConfig[status];

  // For pre_orders in draft, show "Pedido" label
  const isPreOrder = type === "pre_order";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        config.className,
        className
      )}
    >
      {isPreOrder && status === "draft" && "Pedido: "}
      {config.label}
    </span>
  );
}

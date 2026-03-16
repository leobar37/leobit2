import { ShoppingCart } from "lucide-react";
import { ListCard } from "~/components/list";
import { formatCurrency } from "~/lib/utils";
import type { Purchase } from "~/lib/services/purchase-service";

const statusLabels: Record<Purchase["status"], string> = {
  pending: "Pendiente",
  received: "Recibido",
  cancelled: "Cancelado",
};

const statusBadgeClasses: Record<Purchase["status"], string> = {
  pending: "bg-yellow-100 text-yellow-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

interface PurchaseCardProps {
  purchase: Purchase;
  onClick?: () => void;
}

/**
 * Card component for displaying purchase information.
 * Uses the standardized ListCard component with shell-card-flat styling.
 */
export function PurchaseCard({ purchase, onClick }: PurchaseCardProps) {
  const formattedDate = new Date(purchase.purchase_date).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <ListCard
      icon={ShoppingCart}
      iconColor="text-orange-600"
      iconBgColor="bg-orange-100/90"
      title="Sin proveedor"
      subtitle={formattedDate}
      metadata={
        <span className="font-medium text-foreground">
          S/ {formatCurrency(purchase.total_amount)}
        </span>
      }
      badges={[
        {
          label: statusLabels[purchase.status],
          className: statusBadgeClasses[purchase.status],
        },
      ]}
      onClick={onClick}
    />
  );
}

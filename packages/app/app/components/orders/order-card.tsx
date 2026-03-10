import { ClipboardList, Calendar, User, CheckCircle, XCircle, Truck } from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Order } from "~/lib/db/schema";
import { formatDisplayDate, isToday } from "~/lib/date-utils";

import {
  MinimalCard,
  MinimalCardContent,
  MinimalCardMedia,
} from "~/components/cards";

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
}

const statusConfig = {
  draft: {
    label: "Borrador",
    color: "bg-gray-100 text-gray-700",
    icon: ClipboardList,
  },
  confirmed: {
    label: "Confirmado",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  delivered: {
    label: "Entregado",
    color: "bg-green-100 text-green-700",
    icon: Truck,
  },
};

export function OrderCard({ order, onClick }: OrderCardProps) {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  const canDeliver =
    order.status === "confirmed" && isToday(order.deliveryDate);

  return (
    <MinimalCard 
      variant="outlined" 
      interactive 
      clickable 
      radius="md"
      onClick={onClick}
      data-testid="order-card"
      data-order-id={order.id}
      data-order-status={order.status}
    >
      <MinimalCardContent className="p-4">
        <div className="flex items-start gap-4">
          <MinimalCardMedia 
            icon={ClipboardList} 
            iconColor="text-orange-600" 
            size="md" 
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate" data-testid="order-card-customer">
                  {order.client?.name || "Cliente no especificado"}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span data-testid="order-card-delivery-date">
                      {isToday(order.deliveryDate)
                        ? "Hoy"
                        : formatDisplayDate(order.deliveryDate)}
                    </span>
                  </div>
                  {order.items && (
                    <span data-testid="order-card-items-count">{order.items.length} items</span>
                  )}
                </div>
              </div>

              <Badge className={status.color} variant="secondary" data-testid="order-card-status">
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span data-testid="order-card-payment">
                  {order.paymentIntent === "contado" ? "Contado" : "Crédito"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canDeliver && (
                  <Badge className="bg-orange-100 text-orange-700" variant="secondary" data-testid="order-card-ready-badge">
                    Listo para entregar
                  </Badge>
                )}
                <span className="font-semibold text-lg" data-testid="order-card-total">
                  S/ {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>

            {order.syncStatus === "pending" && (
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-1" data-testid="order-card-sync-pending">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Pendiente de sincronización
              </div>
            )}
          </div>
        </div>
      </MinimalCardContent>
    </MinimalCard>
  );
}

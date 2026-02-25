import { ClipboardList, Calendar, User, CheckCircle, XCircle, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order } from "~/lib/db/schema";

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
    });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const canDeliver =
    order.status === "confirmed" && isToday(order.deliveryDate);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon Container */}
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-6 w-6 text-orange-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">
                  {order.client?.name || "Cliente no especificado"}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {isToday(order.deliveryDate)
                        ? "Hoy"
                        : formatDate(order.deliveryDate)}
                    </span>
                  </div>
                  {order.items && (
                    <span>{order.items.length} items</span>
                  )}
                </div>
              </div>

              <Badge className={status.color} variant="secondary">
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>
                  {order.paymentIntent === "contado" ? "Contado" : "Crédito"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canDeliver && (
                  <Badge className="bg-orange-100 text-orange-700" variant="secondary">
                    Listo para entregar
                  </Badge>
                )}
                <span className="font-semibold text-lg">
                  S/ {Number(order.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>

            {order.syncStatus === "pending" && (
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Pendiente de sincronización
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

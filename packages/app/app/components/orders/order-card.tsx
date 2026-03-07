import { useState } from "react";
import { ClipboardList, Calendar, User, CheckCircle, XCircle, Truck, Link2, Copy, Check, Share2, MousePointerClick, Smartphone } from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Order } from "~/lib/db/schema";
import { formatDisplayDate, isToday } from "~/lib/date-utils";
import { isOnline } from "~/lib/sync/utils";

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

const createdViaConfig = {
  manual: {
    label: "Manual",
    color: "bg-purple-100 text-purple-700",
    icon: MousePointerClick,
  },
  token: {
    label: "Por token",
    color: "bg-cyan-100 text-cyan-700",
    icon: Smartphone,
  },
};

function OrderLinkDialog({
  order,
  isOpen,
  onClose,
}: {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const orderUrl = `${appUrl}/pedido/${order.token || ""}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail - user can manually copy
    }
  };

  const handleShareWhatsApp = () => {
    const message = `Hola, te comparto el link de tu pedido: ${orderUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir pedido</DialogTitle>
          <DialogDescription>
            Comparte este link con el cliente para que pueda ver su pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="flex-1 text-sm break-all">{orderUrl}</code>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              className="flex-1"
              variant={copied ? "default" : "outline"}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar link
                </>
              )}
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              variant="outline"
              className="flex-1 bg-green-50 hover:bg-green-100 border-green-200"
            >
              <Share2 className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const createdVia = createdViaConfig[order.createdVia || "manual"];
  const CreatedViaIcon = createdVia.icon;

  const canDeliver =
    order.status === "confirmed" && isToday(order.deliveryDate);

  const isDraft = order.status === "draft";

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      data-testid="order-card"
      data-order-id={order.id}
      data-order-status={order.status}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-6 w-6 text-orange-600" />
          </div>
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

              <div className="flex flex-col gap-1 items-end">
                <Badge className={status.color} variant="secondary" data-testid="order-card-status">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <Badge className={createdVia.color} variant="secondary" data-testid="order-card-origin">
                  <CreatedViaIcon className="h-3 w-3 mr-1" />
                  {createdVia.label}
                </Badge>
              </div>
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

            {isDraft && (
              <div className="mt-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLinkDialogOpen(true);
                  }}
                  data-testid="order-card-link-button"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Generar link
                </Button>
              </div>
            )}

            {order.syncStatus === "pending" && !isOnline() && (
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-1" data-testid="order-card-sync-pending">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Pendiente de sincronización
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <OrderLinkDialog
        order={order}
        isOpen={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
      />
    </Card>
  );
}

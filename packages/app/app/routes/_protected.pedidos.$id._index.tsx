import { useParams, useNavigate, Link } from "react-router";
import { useState } from "react";
import {
  ClipboardList,
  Calendar,
  User,
  CreditCard,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  ArrowLeft,
  Edit,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrder, useConfirmOrder, useCancelOrder, useDeliverOrder } from "~/hooks/use-orders";
import { formatCurrency, cn } from "~/lib/utils";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useSetLayout } from "~/components/layout/app-layout";
import { useToggleOrderTokenStatus, useRegenerateOrderToken } from "~/hooks/use-orders";
import { Switch } from "@/components/ui/switch";
import { Copy, RefreshCw, Link2, Lock } from "lucide-react";
import { OrderItemModal } from "~/components/orders/order-item-modal";
import { OrderDeliveryModal } from "~/components/orders/order-delivery-modal";
import type { OrderItem } from "~/lib/db/schema";
import { isOnline } from "~/lib/sync/utils";
import { toast } from "sonner";

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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id || "");
  const confirmOrder = useConfirmOrder();
  const cancelOrder = useCancelOrder();
  const deliverOrder = useDeliverOrder();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);


  useSetLayout({
    title: "Detalle del pedido",
    showBackButton: true,
    backHref: "/pedidos",
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Cargando pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Pedido no encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/pedidos">Volver a pedidos</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const canEdit = order.status === "draft" || order.status === "confirmed";
  const canConfirm = order.status === "draft";
  const canCancel = order.status !== "delivered" && order.status !== "cancelled";
  const canDeliver = order.status === "confirmed" && isToday(order.deliveryDate);
  const isDraft = order.status === "draft";

  const toggleTokenStatus = useToggleOrderTokenStatus();
  const regenerateToken = useRegenerateOrderToken();

  const orderUrl = order.token?.token
    ? `${import.meta.env.VITE_APP_URL}/pedido/${order.token.token}`
    : null;

  const handleCopyLink = async () => {
    if (orderUrl) {
      await navigator.clipboard.writeText(orderUrl);
      toast.success("Link copiado al portapapeles");
    }
  };

  const handleRegenerateToken = async () => {
    const confirmed = await confirm({
      title: "Regenerar link",
      description: "¿Estás seguro de regenerar el link? El link anterior dejará de funcionar.",
      confirmText: "Sí, regenerar",
    });
    if (confirmed && id) {
      await regenerateToken.mutateAsync({ id });
      toast.success("Link regenerado correctamente");
    }
  };

  const handleToggleTokenStatus = async (isActive: boolean) => {
    if (id) {
      await toggleTokenStatus.mutateAsync({ id, isActive });
      toast.success(isActive ? "Link activado" : "Link bloqueado");
    }
  };

  const getTokenStatusBadge = () => {
    if (order.status === "confirmed") {
      return { label: "Confirmado", color: "bg-blue-100 text-blue-700" };
    }
    if (!order.token?.isActive) {
      return { label: "Bloqueado", color: "bg-red-100 text-red-700" };
    }
    return { label: "Activo", color: "bg-green-100 text-green-700" };
  };

  const handleConfirm = async () => {
    const confirmed = await confirm({
      title: "Confirmar pedido",
      description: "¿Estás seguro de confirmar este pedido? Una vez confirmado, los precios se bloquearán.",
    });
    if (confirmed) {
      await confirmOrder.mutateAsync({ id: order.id, baseVersion: order.version });
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: "Cancelar pedido",
      description: "¿Estás seguro de cancelar este pedido? Esta acción no se puede deshacer.",
      confirmText: "Sí, cancelar",
      variant: "destructive",
    });
    if (confirmed) {
      await cancelOrder.mutateAsync({ id: order.id, baseVersion: order.version });
    }
  };

  const handleDeliverClick = () => {
    setIsDeliveryModalOpen(true);
  };

  const handleDeliverConfirm = async (deliveredItems: Array<{ itemId: string; deliveredQuantity: number; unitPriceFinal?: number }>) => {
    try {
      const result = await deliverOrder.mutateAsync({
        id: order.id,
        baseVersion: order.version,
        deliveredItems,
      });

      setIsDeliveryModalOpen(false);

      toast({
        title: "Pedido entregado",
        description: `Se creó la venta #${result?.sale?.id?.slice(-8) || ""}`,
        action: result?.sale?.id ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/ventas/${result.sale.id}`)}
          >
            Ver venta
          </Button>
        ) : undefined,
      });
    } catch (error) {
      toast({
        title: "Error al entregar",
        description: error instanceof Error ? error.message : "No se pudo procesar la entrega",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pedido</p>
                <p className="font-semibold">#{order.id.slice(-8)}</p>
              </div>
            </div>
            <Badge className={status.color} variant="secondary" data-testid="order-status-badge">
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Customer & Delivery Info */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-semibold" data-testid="order-customer-name">{order.client?.name || "No especificado"}</p>
              {order.client?.phone && (
                <p className="text-sm text-muted-foreground" data-testid="order-customer-phone">{order.client.phone}</p>
              )}
            </div>
          </div>

            <div className="border-t" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de entrega</p>
              <p className="font-semibold" data-testid="order-delivery-date-display">{formatDate(order.deliveryDate)}</p>
              {isToday(order.deliveryDate) && (
                <Badge className="bg-orange-100 text-orange-700 mt-1" data-testid="order-today-badge">Hoy</Badge>
              )}
            </div>
          </div>

            <div className="border-t" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Forma de pago</p>
              <p className="font-semibold" data-testid="order-payment-display">
                {order.paymentIntent === "contado" ? "Contado" : "Crédito"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.token && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Link2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Link del cliente</p>
                <p className="font-medium text-sm truncate text-purple-700" data-testid="order-token-url">
                  {orderUrl}
                </p>
              </div>
              <Badge className={getTokenStatusBadge().color} variant="secondary" data-testid="order-token-status">
                {getTokenStatusBadge().label}
              </Badge>
            </div>

            <div className="border-t" />

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyLink}
              disabled={!orderUrl}
              data-testid="copy-order-link-button"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </Button>

            {isDraft && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRegenerateToken}
                disabled={regenerateToken.isPending}
                data-testid="regenerate-order-token-button"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", regenerateToken.isPending && "animate-spin")} />
                {regenerateToken.isPending ? "Regenerando..." : "Regenerar link"}
              </Button>
            )}

            {isDraft ? (
              <div className="pt-2">
                <Switch
                  checked={order.token.isActive}
                  onCheckedChange={handleToggleTokenStatus}
                  disabled={toggleTokenStatus.isPending}
                  label="Permitir edición"
                  description="El cliente puede modificar el pedido"
                  data-testid="order-token-toggle"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                <Lock className="h-4 w-4" />
                <span>No se puede modificar el link en pedidos {order.status === "confirmed" ? "confirmados" : order.status === "delivered" ? "entregados" : "cancelados"}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items del pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3" data-testid="order-items-list">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
                data-testid="order-item"
                data-item-id={item.id}
              >
                <div>
                  <p className="font-medium" data-testid="order-item-product-name">{item.productName}</p>
                  <p className="text-sm text-muted-foreground" data-testid="order-item-variant">
                    {item.variantName} · {item.orderedQuantity} unidades
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold" data-testid="order-item-subtotal">
                    S/{" "}
                    {formatCurrency(Number(item.orderedQuantity) * Number(item.unitPriceQuoted))}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="order-item-unit-price">
                    S/ {formatCurrency(item.unitPriceQuoted)} c/u
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t my-4" />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-xl font-bold" data-testid="order-total-amount">S/ {formatCurrency(order.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {canEdit && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {canConfirm && (
                <Button
                  onClick={handleConfirm}
                  disabled={confirmOrder.isPending}
                  data-testid="confirm-order-button"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {confirmOrder.isPending ? "Confirmando..." : "Confirmar"}
                </Button>
              )}
              {canDeliver && (
                <Button
                  onClick={handleDeliverClick}
                  disabled={deliverOrder.isPending}
                  data-testid="deliver-order-button"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  {deliverOrder.isPending ? "Procesando..." : "Entregar"}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelOrder.isPending}
                  data-testid="cancel-order-button"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {cancelOrder.isPending ? "Cancelando..." : "Cancelar"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Status */}
      {order.syncStatus === "pending" && !isOnline() && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-xl" data-testid="order-sync-pending">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Este pedido está pendiente de sincronización
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog />

      {/* Edit Item Modal */}
      <OrderItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSave={(newQuantity) => {
          // Handle item modification
          setEditingItem(null);
        }}
      />

      {/* Delivery Modal */}
      <OrderDeliveryModal
        order={order}
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        onConfirm={handleDeliverConfirm}
        isSubmitting={deliverOrder.isPending}
      />
    </div>
  );
}

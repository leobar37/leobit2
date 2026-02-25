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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useOrder, useConfirmOrder, useCancelOrder, useDeliverOrder } from "~/hooks/use-orders";
import { useSetLayout } from "~/components/layout/app-layout";
import { OrderItemModal } from "~/components/orders/order-item-modal";
import type { OrderItem } from "~/lib/db/schema";

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

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeliverDialog, setShowDeliverDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);

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

  const handleConfirm = async () => {
    await confirmOrder.mutateAsync({ id: order.id, baseVersion: order.version });
    setShowConfirmDialog(false);
  };

  const handleCancel = async () => {
    await cancelOrder.mutateAsync({ id: order.id, baseVersion: order.version });
    setShowCancelDialog(false);
  };

  const handleDeliver = async () => {
    // Deliver all items with ordered quantity
    const deliveredItems =
      order.items?.map((item) => ({
        itemId: item.id,
        deliveredQuantity: Number(item.orderedQuantity),
      })) || [];

    await deliverOrder.mutateAsync({
      id: order.id,
      baseVersion: order.version,
      deliveredItems,
    });
    setShowDeliverDialog(false);
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
            <Badge className={status.color} variant="secondary">
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
              <p className="font-semibold">{order.client?.name || "No especificado"}</p>
              {order.client?.phone && (
                <p className="text-sm text-muted-foreground">{order.client.phone}</p>
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
              <p className="font-semibold">{formatDate(order.deliveryDate)}</p>
              {isToday(order.deliveryDate) && (
                <Badge className="bg-orange-100 text-orange-700 mt-1">Hoy</Badge>
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
              <p className="font-semibold">
                {order.paymentIntent === "contado" ? "Contado" : "Crédito"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items del pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
              >
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.variantName} · {item.orderedQuantity} unidades
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    S/{" "}
                    {(Number(item.orderedQuantity) * Number(item.unitPriceQuoted)).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    S/ {Number(item.unitPriceQuoted).toFixed(2)} c/u
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t my-4" />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-xl font-bold">S/ {Number(order.totalAmount).toFixed(2)}</span>
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
                  onClick={() => setShowConfirmDialog(true)}
                  className="rounded-xl bg-blue-500 hover:bg-blue-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar
                </Button>
              )}
              {canDeliver && (
                <Button
                  onClick={() => setShowDeliverDialog(true)}
                  className="rounded-xl bg-green-500 hover:bg-green-600"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Entregar
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Status */}
      {order.syncStatus === "pending" && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Este pedido está pendiente de sincronización
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pedido</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de confirmar este pedido? Una vez confirmado, los precios se
              bloquearán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={confirmOrder.isPending}>
              {confirmOrder.isPending ? "Confirmando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de cancelar este pedido? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              No, mantener
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelOrder.isPending}>
              {cancelOrder.isPending ? "Cancelando..." : "Sí, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliver Dialog */}
      <Dialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entregar pedido</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de entregar este pedido? Se convertirá en una venta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliverDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDeliver} disabled={deliverOrder.isPending}>
              {deliverOrder.isPending ? "Procesando..." : "Entregar y crear venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}

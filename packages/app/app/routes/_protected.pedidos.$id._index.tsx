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
  Edit,
  Share2,
  Trash2,
  Link as LinkIcon,
  MessageCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrder, useConfirmOrder, useCancelOrder, useDeliverOrder, useOrderItems, useDeleteOrder } from "~/hooks/use-orders";
import { formatCurrency } from "~/lib/utils";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useSetLayout } from "~/components/layout/app-layout";
import { toast } from "sonner";
import { isValidUUID } from "~/lib/uuid";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  useOrderToken,
  useGenerateOrderToken,
  buildOrderShareUrl,
  buildWhatsAppMessage,
  copyToClipboard,
  shareViaWhatsApp,
  shareNative,
} from "~/hooks/use-order-token";

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
  const orderId = isValidUUID(id) ? id : "";
  const { data: orders, isLoading: isLoadingOrder } = useOrder(orderId);
  const order = orders?.[0];
  const { data: items, isLoading: isLoadingItems } = useOrderItems(orderId);
  const confirmOrder = useConfirmOrder();
  const cancelOrder = useCancelOrder();
  const deliverOrder = useDeliverOrder();
  const deleteOrder = useDeleteOrder();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data: tokenData, isLoading: isLoadingToken, error: tokenError, refetch: refetchToken } = useOrderToken(orderId);
  const generateToken = useGenerateOrderToken();

  const handleGenerateToken = async () => {
    try {
      await generateToken.mutateAsync(orderId);
      toast.success("Enlace generado");
    } catch (error) {
      toast.error("Error al generar el enlace");
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = buildOrderShareUrl(token);
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("Enlace copiado");
    } else {
      toast.error("No se pudo copiar");
    }
  };

  const handleShareWhatsApp = (token: string) => {
    if (!order) return;
    const url = buildOrderShareUrl(token);
    const message = buildWhatsAppMessage(url, order.id);
    shareViaWhatsApp("", message);
  };

  const handleNativeShare = async (token: string) => {
    if (!order) return;
    const url = buildOrderShareUrl(token);
    const success = await shareNative({
      title: `Pedido #${order.id.slice(-8)}`,
      text: "Completa tu pedido aquí:",
      url,
    });
    if (!success) {
      await handleCopyLink(token);
    }
  };

  useSetLayout({
    title: "Detalle del pedido",
    showBackButton: true,
    backHref: "/pedidos",
  });

  if (isLoadingOrder) {
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
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Pedido no encontrado</p>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  const handleConfirm = async () => {
    const confirmed = await confirm({
      title: "Confirmar pedido",
      description: "¿Está seguro de confirmar este pedido? Una vez confirmado no podrá modificar los items.",
      confirmText: "Confirmar",
      cancelText: "Cancelar",
    });

    if (confirmed) {
      try {
        await confirmOrder.mutateAsync(order.id);
        toast.success("Pedido confirmado");
      } catch (error) {
        toast.error("Error al confirmar el pedido");
      }
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: "Cancelar pedido",
      description: "¿Está seguro de cancelar este pedido? Esta acción no se puede deshacer.",
      confirmText: "Cancelar pedido",
      cancelText: "Volver",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await cancelOrder.mutateAsync(order.id);
        toast.success("Pedido cancelado");
      } catch (error) {
        toast.error("Error al cancelar el pedido");
      }
    }
  };

  const handleDeliver = async () => {
    const confirmed = await confirm({
      title: "Marcar como entregado",
      description: "¿Está seguro de marcar este pedido como entregado?",
      confirmText: "Sí, entregado",
      cancelText: "Cancelar",
    });

    if (confirmed) {
      try {
        await deliverOrder.mutateAsync(order.id);
        toast.success("Pedido marcado como entregado");
      } catch (error) {
        toast.error("Error al actualizar el pedido");
      }
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Eliminar pedido",
      description: "¿Está seguro de eliminar este pedido? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteOrder.mutateAsync(order.id);
        toast.success("Pedido eliminado");
        navigate("/pedidos");
      } catch (error) {
        toast.error("Error al eliminar el pedido");
      }
    }
  };

  const canDelete = order && (order.status === "draft" || !items || items.length === 0);

  return (
    <div className="space-y-4 pb-20">
      <ConfirmDialog />
      
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          {order.status === "draft" && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/pedidos/${order.id}/editar`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareOpen(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <Badge className={status.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Pedido #{order.id.slice(0, 8)}
        </span>
      </div>

      {/* Order Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Información del pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cliente ID:</span>
            <span className="text-sm font-medium">{order.clientId}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Fecha de entrega:</span>
            <span className="text-sm font-medium">{order.deliveryDate}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Pago:</span>
            <span className="text-sm font-medium capitalize">{order.paymentIntent}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-sm font-medium">S/ {formatCurrency(order.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Items del pedido</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingItems ? (
            <p className="text-muted-foreground text-center py-4">Cargando items...</p>
          ) : !items || items.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay items en este pedido</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">{item.variantName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.orderedQuantity} und</p>
                    <p className="text-sm text-muted-foreground">
                      S/ {formatCurrency(item.unitPriceQuoted)} c/u
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {order.status === "draft" && (
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={confirmOrder.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar pedido
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelOrder.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      )}

      {order.status === "confirmed" && (
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={handleDeliver}
          disabled={deliverOrder.isPending}
        >
          <Truck className="h-4 w-4 mr-2" />
          Marcar como entregado
        </Button>
      )}

      {/* Delete button - only for draft or empty orders */}
      {canDelete && (
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={handleDelete}
          disabled={deleteOrder.isPending}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar pedido
        </Button>
      )}

      <Sheet open={isShareOpen} onOpenChange={setIsShareOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>Compartir pedido</SheetTitle>
            <SheetDescription>
              Envía este enlace a tu cliente para que pueda ver y completar el pedido.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {isLoadingToken ? (
              <div className="text-center py-8">
                <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
              </div>
            ) : tokenError ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Error al cargar</p>
                  <p className="text-sm text-muted-foreground">
                    No se pudo verificar si el pedido ya tiene un enlace
                  </p>
                </div>
                <Button onClick={() => refetchToken()} variant="outline" className="w-full">
                  Reintentar
                </Button>
              </div>
            ) : !tokenData ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <LinkIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Generar enlace</p>
                  <p className="text-sm text-muted-foreground">
                    Crea un enlace único para compartir con tu cliente
                  </p>
                </div>
                <Button
                  onClick={handleGenerateToken}
                  disabled={generateToken.isPending}
                  className="w-full"
                >
                  {generateToken.isPending ? "Generando..." : "Generar enlace"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Enlace público:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={buildOrderShareUrl(tokenData.token)}
                      className="flex-1 px-3 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyLink(tokenData.token)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto py-4 border-green-200 hover:bg-green-50"
                    onClick={() => handleShareWhatsApp(tokenData.token)}
                  >
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <span className="text-xs">WhatsApp</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto py-4"
                    onClick={() => handleNativeShare(tokenData.token)}
                  >
                    <ExternalLink className="h-5 w-5" />
                    <span className="text-xs">Compartir</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  asChild
                >
                  <a
                    href={buildOrderShareUrl(tokenData.token)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver cómo lo ve el cliente
                  </a>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

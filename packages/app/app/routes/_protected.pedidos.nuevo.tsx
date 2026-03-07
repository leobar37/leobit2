import { Outlet, useNavigate } from "react-router";
import { useState } from "react";
import { Copy, Link2, X, ExternalLink } from "lucide-react";
import { OrderFormProvider } from "~/components/orders/order-form-context";
import { useCreateOrder } from "~/hooks/use-orders";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Order } from "~/lib/db/schema";

export default function NewOrderLayout() {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const handleSubmit = async (
    data: Parameters<typeof createOrder.mutateAsync>[0],
  ) => {
    try {
      const order = await createOrder.mutateAsync(data);

      if (data.clientId === null && order) {
        setCreatedOrder(order);
        setShowLinkModal(true);
      } else {
        navigate("/pedidos");
      }
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const handleCloseModal = () => {
    setShowLinkModal(false);
    setCreatedOrder(null);
    navigate("/pedidos");
  };

  const orderLink = createdOrder
    ? `${window.location.origin}/invitations/${createdOrder.id}`
    : "";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(orderLink);
  };

  const handleShare = async () => {
    const shareData = {
      title: "Pedido de pollo",
      text: "Completa tu pedido de pollo aquí",
      url: orderLink,
    };

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await handleCopyLink();
    }
  };

  return (
    <OrderFormProvider
      onSubmit={handleSubmit}
      isSubmitting={createOrder.isPending}
      onNavigateToCalculadora={() => navigate("/pedidos/nuevo/calculadora")}
    >
      <Outlet />

      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-orange-500" />
              Pedido creado
            </DialogTitle>
            <DialogDescription>
              Comparte este link con el cliente para que complete sus datos
            </DialogDescription>
          </DialogHeader>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <p className="text-sm text-orange-800 font-medium">
                  El cliente podrá ver y completar su pedido
                </p>
              </div>

              <div className="bg-white rounded-xl p-3 border border-orange-200">
                <p className="text-xs text-muted-foreground mb-2">
                  Link del pedido:
                </p>
                <code className="block text-sm break-all text-orange-700 bg-orange-100/50 px-2 py-1 rounded">
                  {orderLink}
                </code>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={handleCloseModal}
              className="flex-1 rounded-xl"
            >
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
            >
              <Copy className="h-4 w-4 mr-2" />
              {!!navigator.share ? "Compartir" : "Copiar link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OrderFormProvider>
  );
}

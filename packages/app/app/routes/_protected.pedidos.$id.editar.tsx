import { Outlet, useParams, useNavigate, Link } from "react-router";
import { OrderFormProvider } from "~/components/orders/order-form-context";
import { useOrder, useUpdateOrder } from "~/hooks/use-orders";
import { useCustomer } from "~/hooks/use-customer";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidUUID } from "~/lib/uuid";

export default function EditOrderLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = isValidUUID(id) ? id : "";
  const { data: orders, isLoading: isOrderLoading } = useOrder(orderId);
  const order = orders?.[0];
  const updateOrder = useUpdateOrder();

  const { data: customer, isLoading: isCustomerLoading } = useCustomer(order?.clientId || "");

  const handleSubmit = async (data: {
    clientId: string;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    totalAmount: number;
    items: Array<{
      productId: string;
      variantId: string;
      productName: string;
      variantName: string;
      orderedQuantity: number;
      unitPriceQuoted: number;
    }>;
  }) => {
    if (!orderId || !order) return;
    
    try {
      await updateOrder.mutateAsync({
          id: orderId,
        input: {
          baseVersion: order.version,
          deliveryDate: data.deliveryDate,
          paymentIntent: data.paymentIntent,
          totalAmount: data.totalAmount,
          items: data.items,
        },
      });
      navigate(`/pedidos/${orderId}`);
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  if (isOrderLoading || isCustomerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!order || !customer) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Pedido no encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/pedidos">Volver a pedidos</Link>
        </Button>
      </div>
    );
  }

  return (
    <OrderFormProvider
      onSubmit={handleSubmit}
      isSubmitting={updateOrder.isPending}
    >
      <Outlet context={{ customer, order }} />
    </OrderFormProvider>
  );
}

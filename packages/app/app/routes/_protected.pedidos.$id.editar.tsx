import { Outlet, useParams, useNavigate } from "react-router";
import { OrderFormProvider } from "~/components/orders/order-form-context";
import { useOrder, useUpdateOrder } from "~/hooks/use-orders";
import { useCustomer } from "~/hooks/use-customer";
import { Loader2 } from "lucide-react";

export default function EditOrderLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading: isOrderLoading } = useOrder(id || "");
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
    if (!id || !order) return;
    
    try {
      await updateOrder.mutateAsync({
        id,
        input: {
          baseVersion: order.version,
          deliveryDate: data.deliveryDate,
          paymentIntent: data.paymentIntent,
          totalAmount: data.totalAmount,
          items: data.items,
        },
      });
      navigate(`/pedidos/${id}`);
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
    return null;
  }

  const initialOrder = {
    clientId: order.clientId,
    deliveryDate: order.deliveryDate,
    paymentIntent: order.paymentIntent,
    paymentStatus: order.paymentStatus,
    advanceAmount: order.advanceAmount ? Number(order.advanceAmount) : undefined,
    balanceDue: order.balanceDue ? Number(order.balanceDue) : undefined,
    advancePaymentMethod: order.advancePaymentMethod as "efectivo" | "yape" | "plin" | "transferencia" | undefined,
    advanceReferenceNumber: order.advanceReferenceNumber || undefined,
    totalAmount: Number(order.totalAmount),
    items: order.items?.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      orderedQuantity: Number(item.orderedQuantity),
      unitPriceQuoted: Number(item.unitPriceQuoted),
    })) || [],
  };

  return (
    <OrderFormProvider
      onSubmit={handleSubmit}
      isSubmitting={updateOrder.isPending}
      onNavigateToCalculadora={() => navigate(`/pedidos/${id}/editar/calculadora`)}
      initialOrder={initialOrder}
    >
      <Outlet context={{ customer, order }} />
    </OrderFormProvider>
  );
}

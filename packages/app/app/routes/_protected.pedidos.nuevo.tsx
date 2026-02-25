import { useNavigate } from "react-router";
import { OrderForm } from "~/components/orders/order-form";
import { useCreateOrder } from "~/hooks/use-orders";
import { useSetLayout } from "~/components/layout/app-layout";
import type { CreateOrderInput } from "~/lib/db/schema";

export default function NewOrderPage() {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();

  useSetLayout({
    title: "Nuevo pedido",
    showBackButton: true,
    backHref: "/pedidos",
  });

  const handleSubmit = async (data: CreateOrderInput) => {
    try {
      await createOrder.mutateAsync(data);
      navigate("/pedidos");
    } catch (error) {
      console.error("Error creating order:", error);
      // Error handling is managed by the mutation
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <OrderForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/pedidos")}
        isSubmitting={createOrder.isPending}
      />
    </div>
  );
}

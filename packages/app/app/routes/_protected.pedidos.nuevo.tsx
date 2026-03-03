import { useNavigate } from "react-router";
import { OrderForm } from "~/components/orders/order-form";
import { useCreateOrder } from "~/hooks/use-orders";
import { FormPage } from "~/components/layout/form-page";
import type { CreateOrderInput } from "~/lib/db/schema";

export default function NewOrderPage() {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();

  const handleSubmit = async (data: CreateOrderInput) => {
    try {
      await createOrder.mutateAsync(data);
      navigate("/pedidos");
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  return (
    <FormPage
      title="Nuevo pedido"
      backHref="/pedidos"
      maxWidth="lg"
    >
      <OrderForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/pedidos")}
        isSubmitting={createOrder.isPending}
      />
    </FormPage>
  );
}

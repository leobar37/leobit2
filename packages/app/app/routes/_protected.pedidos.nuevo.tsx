import { Outlet, useNavigate } from "react-router";
import { OrderFormProvider } from "~/components/orders/order-form-context";
import { useCreateOrder } from "~/hooks/use-orders";

export default function NewOrderLayout() {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();

  const handleSubmit = async (data: Parameters<typeof createOrder.mutateAsync>[0]) => {
    try {
      await createOrder.mutateAsync(data);
      navigate("/pedidos");
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  return (
    <OrderFormProvider
      onSubmit={handleSubmit}
      isSubmitting={createOrder.isPending}
      onNavigateToCalculadora={() => navigate("/pedidos/nuevo/calculadora")}
    >
      <Outlet />
    </OrderFormProvider>
  );
}

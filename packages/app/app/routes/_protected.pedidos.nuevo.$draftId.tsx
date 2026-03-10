import { Outlet, useNavigate, useParams, useLocation } from "react-router";
import { useEffect } from "react";
import { useOrder } from "~/hooks/use-orders";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidUUID } from "~/lib/uuid";
import type { Order } from "~/lib/db/schemas/order";

interface LocationState {
  order?: Order;
}

export default function NewOrderLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const { draftId: orderId } = useParams<{ draftId: string }>();
  const isValidOrderId = isValidUUID(orderId);

  const locationState = location.state as LocationState | null;
  const orderFromState = locationState?.order;

	const { data: existingOrders, isLoading } = useOrder(orderFromState ? "" : isValidOrderId ? orderId : "");
	const existingOrder = orderFromState ?? existingOrders?.[0];

  useEffect(() => {
    if (!isValidOrderId && orderId) {
      navigate("/pedidos/nuevo", { replace: true });
    }
  }, [isValidOrderId, orderId, navigate]);

	if (!isValidOrderId || isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-orange-500" />
			</div>
		);
	}

  if (!existingOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-muted-foreground mb-4">Orden no encontrada</p>
          <Button onClick={() => navigate("/pedidos/nuevo")} className="bg-orange-500 hover:bg-orange-600">
            Crear nuevo pedido
          </Button>
        </div>
      </div>
    );
  }

	return <Outlet context={{ order: existingOrder }} />;
}

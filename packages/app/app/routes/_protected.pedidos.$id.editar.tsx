import { Outlet, useParams, useNavigate } from "react-router";
import { useEffect } from "react";
import { useOrder } from "~/hooks/use-orders";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidUUID } from "~/lib/uuid";

export default function EditOrderLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isValidOrderId = isValidUUID(id);

  const { data: orders, isLoading } = useOrder(isValidOrderId ? id : "");
  const order = orders?.[0];

  useEffect(() => {
    if (!isValidOrderId) {
      navigate("/pedidos", { replace: true });
    }
  }, [isValidOrderId, navigate]);

  if (!isValidOrderId || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <p className="text-muted-foreground mb-4">Pedido no encontrado</p>
          <Button onClick={() => navigate("/pedidos")} className="bg-orange-500 hover:bg-orange-600">
            Volver a pedidos
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

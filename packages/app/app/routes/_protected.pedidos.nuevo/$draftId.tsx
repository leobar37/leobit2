import { Outlet, useNavigate, useParams } from "react-router";
import { useEffect } from "react";
import { useOrder } from "~/hooks/use-orders";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidUUID } from "~/lib/uuid";

export default function NewOrderLayout() {
	const navigate = useNavigate();
	const { draftId } = useParams<{ draftId: string }>();
  const isValidDraftId = isValidUUID(draftId);

	const { data: existingOrders, isLoading } = useOrder(isValidDraftId ? draftId : "");
	const existingOrder = existingOrders?.[0];

  useEffect(() => {
    if (!isValidDraftId) {
      navigate("/pedidos/nuevo", { replace: true });
    }
  }, [isValidDraftId, navigate]);

	if (!isValidDraftId || isLoading) {
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
          <p className="text-muted-foreground mb-4">Borrador no encontrado</p>
          <Button onClick={() => navigate("/pedidos/nuevo")} className="bg-orange-500 hover:bg-orange-600">
            Crear nuevo pedido
          </Button>
        </div>
      </div>
    );
  }

	return <Outlet />;
}

import { useParams, useNavigate } from "react-router";
import { DraftOrderForm } from "~/components/orders/draft-order-form";
import { useSetLayout } from "~/components/layout/app-layout";
import { useOrder } from "~/hooks/use-orders";

export default function NewOrderDraftPage() {
	const { draftId } = useParams<{ draftId: string }>();
	const navigate = useNavigate();
	const { data: drafts, isLoading } = useOrder(draftId ?? "");
	const draft = drafts?.[0];

	useSetLayout({ title: "Nuevo Pedido" });

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center p-6">
					<p className="text-muted-foreground">Cargando borrador...</p>
				</div>
			</div>
		);
	}

	if (!draft || !draftId) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center p-6">
					<p className="text-muted-foreground mb-4">Borrador no encontrado</p>
					<button
						onClick={() => navigate("/pedidos/nuevo")}
						className="text-orange-500 hover:text-orange-600 font-medium"
					>
						Crear nuevo pedido
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="pb-32">
			<DraftOrderForm draftId={draftId} onSubmitSuccess={() => navigate("/pedidos")} />
		</div>
	);
}

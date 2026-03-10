import { useParams, useNavigate, useOutletContext } from "react-router";
import { OrderForm } from "~/components/orders/order-form";
import { OrderFormErrorBoundary } from "~/components/orders/order-form-error-boundary";
import { useSetLayout } from "~/components/layout/app-layout";
import type { Order } from "~/lib/db/schemas/order";

interface OutletContext {
	order: Order | undefined;
}

export default function NewOrderDraftPage() {
	const { draftId: orderId } = useParams<{ draftId: string }>();
	const navigate = useNavigate();
	const { order } = useOutletContext<OutletContext>();

	useSetLayout({ title: "Nuevo Pedido" });

	if (!orderId) {
		return null;
	}

	return (
		<div className="pb-32">
			<OrderFormErrorBoundary>
				<OrderForm
					orderId={orderId}
					order={order}
					onSubmitSuccess={() => navigate("/pedidos")}
				/>
			</OrderFormErrorBoundary>
		</div>
	);
}

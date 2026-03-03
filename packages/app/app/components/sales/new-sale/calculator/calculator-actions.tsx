import { Plus, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalculatorActionsProps {
	isValid: boolean;
	isKgProduct: boolean;
	onAddToCart: () => void;
	onClear: () => void;
	onSelectAnother: () => void;
}

export function CalculatorActions({
	isValid,
	isKgProduct,
	onAddToCart,
	onClear,
	onSelectAnother,
}: CalculatorActionsProps) {
	return (
		<div className="space-y-2">
			<Button
				onClick={onAddToCart}
				disabled={!isValid}
				data-testid="add-to-cart-button"
				className="w-full bg-orange-500 hover:bg-orange-600 h-12"
			>
				<Plus className="h-4 w-4 mr-2" />
				Agregar al Carrito
			</Button>

			<div className="flex gap-2">
				<Button
					variant="outline"
					onClick={onClear}
					data-testid="calculator-reset-button"
					className="flex-1 rounded-xl"
					size="sm"
				>
					<RotateCcw className="h-4 w-4 mr-2" />
					{isKgProduct ? "Limpiar Peso" : "Limpiar"}
				</Button>
				<Button
					variant="outline"
					onClick={onSelectAnother}
					data-testid="another-product-button"
					className="flex-1 rounded-xl"
					size="sm"
				>
					<ArrowRight className="h-4 w-4 mr-2" />
					Otro Producto
				</Button>
			</div>
		</div>
	);
}

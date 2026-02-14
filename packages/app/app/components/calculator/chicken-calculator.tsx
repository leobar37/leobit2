import { Calculator, RotateCcw, DollarSign, Weight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormCalculatorInput } from "@/components/forms/form-calculator-input";
import { useChickenCalculator } from "@/hooks/use-chicken-calculator";

interface ChickenCalculatorProps {
	onAddToCart?: (data: {
		netWeight: number;
		totalAmount: number;
		pricePerKg: number;
	}) => void;
	productPrice?: string;
}

export function ChickenCalculator({
	onAddToCart,
	productPrice,
}: ChickenCalculatorProps) {
	const {
		values,
		activeField,
		kgNeto,
		filledCount,
		isReady,
		handleReset,
		handleChange,
	} = useChickenCalculator({ productPrice });

	return (
		<Card className="border-0 shadow-md rounded-2xl">
			<CardContent className="p-4 space-y-4">
				<div className="flex items-center gap-2 mb-2">
					<Calculator className="h-5 w-5 text-orange-500" />
					<h3 className="font-semibold">Calculadora</h3>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<FormCalculatorInput
						label="Monto Total (S/)"
						icon={DollarSign}
						isActive={activeField === "totalAmount"}
						type="text"
						inputMode="decimal"
						value={values.totalAmount}
						onChange={(e) => handleChange("totalAmount", e.target.value)}
						placeholder="0.00"
					/>

					<FormCalculatorInput
						label="Precio/kg (S/)"
						icon={DollarSign}
						isActive={activeField === "pricePerKg"}
						type="text"
						inputMode="decimal"
						value={values.pricePerKg}
						onChange={(e) => handleChange("pricePerKg", e.target.value)}
						placeholder="0.00"
					/>

					<FormCalculatorInput
						label="Bruto (kg)"
						icon={Weight}
						isActive={activeField === "kilos"}
						type="text"
						inputMode="decimal"
						value={values.kilos}
						onChange={(e) => handleChange("kilos", e.target.value)}
						placeholder="0.000"
						step="0.001"
					/>

					<FormCalculatorInput
						label="Tara (kg)"
						icon={Package}
						isActive={activeField === "tara"}
						type="text"
						inputMode="decimal"
						value={values.tara}
						onChange={(e) => handleChange("tara", e.target.value)}
						placeholder="0"
						step="0.001"
					/>
				</div>

				{filledCount >= 1 && (
					<div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200">
						<div className="grid grid-cols-2 gap-3">
							<div className="text-center">
								<p className="text-xs text-gray-500 uppercase">Neto</p>
								<p className="text-lg font-bold text-orange-600">
									{kgNeto.toFixed(3)} kg
								</p>
							</div>
							<div className="text-center">
								<p className="text-xs text-gray-500 uppercase">Total</p>
								<p className="text-lg font-bold text-green-600">
									S/ {values.totalAmount || "0.00"}
								</p>
							</div>
						</div>
					</div>
				)}

				<Button
					variant="outline"
					onClick={handleReset}
					className="w-full rounded-xl"
					size="sm"
				>
					<RotateCcw className="w-4 h-4 mr-2" />
					Limpiar
				</Button>

				<div className="flex items-center justify-center gap-2 text-xs">
					<span className="text-gray-500">Campos:</span>
					{isReady ? (
						<span className="text-green-600 font-medium flex items-center gap-1">
							<span className="w-2 h-2 bg-green-500 rounded-full"></span>
							Listo
						</span>
					) : (
						<span className="text-amber-600 font-medium">
							{3 - filledCount} más
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

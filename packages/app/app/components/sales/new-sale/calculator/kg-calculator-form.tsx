import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { KgCalculatorFormData } from "~/lib/sales/calculator-schema";

interface KgCalculatorFormProps {
	kgNeto: number;
	variantPrice: string;
	hideTara?: boolean;
	setFieldValue?: (field: string, value: string) => void;
}

export function KgCalculatorForm({ kgNeto, variantPrice, hideTara = false, setFieldValue }: KgCalculatorFormProps) {
	const { control, watch } = useFormContext<KgCalculatorFormData>();
	const currentPrice = watch("pricePerKg");

	const handleChange = (field: string, value: string) => {
		if (setFieldValue) {
			setFieldValue(field, value);
		}
	};

	return (
		<>
			<div>
				<Label className="text-xs flex items-center justify-between">
					<span>Precio/kg (S/)</span>
					{variantPrice && (
						<span className="text-orange-600 font-medium">
							S/ {variantPrice}
						</span>
					)}
				</Label>
				<Controller
					name="pricePerKg"
					control={control}
					render={({ field }) => (
						<Input
							type="text"
							inputMode="decimal"
							placeholder={variantPrice || "0.00"}
							className="rounded-xl"
							data-testid="calculator-price-per-kg"
							value={field.value}
							onChange={(e) => handleChange("pricePerKg", e.target.value)}
						/>
					)}
				/>
			</div>
			<div>
				<Label className="text-xs">Bruto (kg)</Label>
				<Controller
					name="kilos"
					control={control}
					render={({ field }) => (
						<Input
							type="text"
							inputMode="decimal"
							placeholder="0.000"
							className="rounded-xl"
							data-testid="calculator-kilos"
							value={field.value}
							onChange={(e) => handleChange("kilos", e.target.value)}
						/>
					)}
				/>
			</div>
			{!hideTara && (
				<div>
					<Label className="text-xs">Tara (kg)</Label>
					<Controller
						name="tara"
						control={control}
						render={({ field }) => (
							<Input
								type="text"
								inputMode="decimal"
								placeholder="0"
								className="rounded-xl"
								data-testid="calculator-tara"
								value={field.value}
								onChange={(e) => handleChange("tara", e.target.value)}
							/>
						)}
					/>
				</div>
			)}

			{kgNeto > 0 && (
				<div
					className="col-span-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200"
					data-testid="calculator-summary"
				>
					<div className="grid grid-cols-2 gap-3">
						<div className="text-center">
							<p className="text-xs text-gray-500 uppercase">Neto</p>
							<p className="text-lg font-bold text-orange-600" data-testid="calculator-net-weight">
								{kgNeto.toFixed(3)} kg
							</p>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

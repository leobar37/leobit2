import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import type { ProductVariant } from "~/hooks/use-product-variants";
import type { UnitCalculatorFormData } from "~/lib/sales/calculator-schema";
import { parseNumber } from "~/lib/sales/calculator-schema";

interface UnitCalculatorFormProps {
	variant: ProductVariant | undefined;
}

export function UnitCalculatorForm({ variant }: UnitCalculatorFormProps) {
	const { control, watch } = useFormContext<UnitCalculatorFormData>();

	const packsValue = watch("packs");
	const packs = parseNumber(packsValue);
	const hasPacks = packs > 0;

	const unitQuantity = Math.max(1, parseNumber(variant?.unitQuantity || "1") || 1);
	const variantPrice = parseNumber(variant?.price || "0");
	const totalUnits = hasPacks ? packs * unitQuantity : 0;

	// Calculate price per unit for display
	const pricePerUnit = unitQuantity > 0 ? variantPrice / unitQuantity : 0;

	return (
		<>
			<div>
				<Label htmlFor="packs-input" className="text-xs">
					Packs
				</Label>
				<Controller
					name="packs"
					control={control}
					render={({ field }) => (
						<Input
							id="packs-input"
							type="text"
							inputMode="decimal"
							placeholder="0"
							className="rounded-xl"
							data-testid="calculator-packs"
							{...field}
						/>
					)}
				/>
				{variant?.unitQuantity && (
					<p className="text-xs text-muted-foreground mt-1">
						{variant.unitQuantity} unidades por pack
					</p>
				)}
			</div>
			<div>
				<Label htmlFor="units-input" className="text-xs">
					Unidades
				</Label>
				<Controller
					name="units"
					control={control}
					render={({ field }) => (
						<Input
							id="units-input"
							type="text"
							inputMode="decimal"
							placeholder="0"
							className="rounded-xl"
							data-testid="calculator-units"
							disabled={hasPacks}
							{...field}
						/>
					)}
				/>
				{hasPacks ? (
					<p className="text-xs text-orange-600 mt-1">
						Auto-calculado desde packs
					</p>
				) : pricePerUnit > 0 ? (
					<p className="text-xs text-muted-foreground mt-1">
						S/ {pricePerUnit.toFixed(2)} / un
					</p>
				) : null}
			</div>

			{hasPacks && totalUnits > 0 && (
				<div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl col-span-2">
					<Info className="h-4 w-4 text-orange-600" />
					<span className="text-sm text-orange-700">
						{packs} packs × {unitQuantity} un = {totalUnits} unidades totales
					</span>
				</div>
			)}
		</>
	);
}

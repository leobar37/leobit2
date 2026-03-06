import { useFormContext } from "react-hook-form";
import { FormCalculatorInput } from "@/components/forms/form-calculator-input";
import { Info } from "lucide-react";
import type { ProductVariant } from "~/hooks/use-product-variants";
import type { UnitCalculatorFormData } from "~/lib/sales/calculator-schema";
import { parseNumber } from "~/lib/sales/calculator-schema";
import { formatCurrency } from "~/lib/utils";

interface UnitCalculatorFormProps {
	variant: ProductVariant | undefined;
	setFieldValue?: (field: string, value: string) => void;
}

export function UnitCalculatorForm({ variant, setFieldValue }: UnitCalculatorFormProps) {
	const { watch, setValue } = useFormContext<UnitCalculatorFormData>();

	// Watch all form values to display calculated values
	const pricePerPackValue = watch("pricePerPack");
	const packsValue = watch("packs");
	const unitsValue = watch("units");
	const totalAmountValue = watch("totalAmount");

	const pricePerPack = pricePerPackValue 
		? parseNumber(pricePerPackValue) 
		: parseNumber(variant?.price || "0");
	const packs = parseNumber(packsValue);
	const hasPacks = packs > 0;

	const unitQuantity = Math.max(1, parseNumber(variant?.unitQuantity || "1") || 1);
	const variantPrice = parseNumber(variant?.price || "0");
	const totalUnits = hasPacks ? packs * unitQuantity : 0;

	// Use pricePerPack from form if entered, otherwise fall back to variant price
	const effectivePricePerPack = parseNumber(pricePerPackValue) > 0 
		? parseNumber(pricePerPackValue) 
		: variantPrice;
	
	const pricePerUnit = unitQuantity > 0 ? effectivePricePerPack / unitQuantity : 0;

	const packsHelperText = variant?.unitQuantity 
		? `${variant.unitQuantity} unidades por pack` 
		: undefined;

	const pricePerPackHelperText = variant?.price
		? `Precio base: S/ ${variant.price}`
		: undefined;

	const unitsHelperText = hasPacks 
		? "Auto-calculado desde packs" 
		: pricePerUnit > 0 
			? `S/ ${formatCurrency(pricePerUnit)} / un`
			: undefined;

	const handleChange = (field: string, value: string) => {
		if (setFieldValue) {
			setFieldValue(field, value);
		} else {
			setValue(field as never, value as never, { shouldValidate: true });
		}
	};

	return (
		<>
			<FormCalculatorInput
				name="pricePerPack"
				label="Precio pack (S/)"
				placeholder={variant?.price || "0.00"}
				data-testid="calculator-price-per-pack"
				helperText={pricePerPackHelperText}
				decimals={2}
				value={pricePerPackValue || variant?.price || ""}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("pricePerPack", e.target.value)}
			/>
			<FormCalculatorInput
				name="packs"
				label="Packs"
				placeholder="0"
				data-testid="calculator-packs"
				helperText={packsHelperText}
				decimals={3}
				value={packsValue}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("packs", e.target.value)}
			/>
			<FormCalculatorInput
				name="units"
				label="Unidades"
				placeholder="0"
				data-testid="calculator-units"
				disabled={hasPacks}
				helperText={unitsHelperText}
				decimals={3}
				value={unitsValue}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("units", e.target.value)}
			/>

			{hasPacks && totalUnits > 0 && (
				<div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl col-span-2">
					<Info className="h-4 w-4 text-orange-600 flex-shrink-0" />
					<span className="text-sm text-orange-700">
						{packs} packs × {unitQuantity} un = {totalUnits} unidades totales
					</span>
				</div>
			)}
		</>
	);
}

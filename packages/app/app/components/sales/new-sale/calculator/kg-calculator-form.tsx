import { useFormContext } from "react-hook-form";
import { FormCalculatorInput } from "@/components/forms/form-calculator-input";
import type { KgCalculatorFormData } from "~/lib/sales/calculator-schema";
import { OCRButton } from "./ocr-button";
import type { OCRResult } from "~/hooks/use-ocr-calculator";
import { formatWeight } from "~/lib/utils";

interface KgCalculatorFormProps {
	kgNeto: number;
	variantPrice: string;
	hideTara?: boolean;
	setFieldValue?: (field: string, value: string) => void;
}

export function KgCalculatorForm({ kgNeto, variantPrice, hideTara = false, setFieldValue }: KgCalculatorFormProps) {
	const { setValue, watch } = useFormContext<KgCalculatorFormData>();

	// Watch all form values to display calculated values
	const pricePerKg = watch("pricePerKg");
	const kilos = watch("kilos");
	const tara = watch("tara");

	const handleChange = (field: string, value: string) => {
		if (setFieldValue) {
			setFieldValue(field, value);
		}
	};

	const handleOCRResult = (result: OCRResult) => {
		if (result.bruto) {
			setValue("kilos", result.bruto, { shouldValidate: true });
		}
		if (result.tara) {
			setValue("tara", result.tara, { shouldValidate: true });
		}
		if (result.precioPorKg) {
			setValue("pricePerKg", result.precioPorKg, { shouldValidate: true });
		}
	};

	return (
		<>
			<FormCalculatorInput
				name="pricePerKg"
				label="Precio/kg (S/)"
				helperText={variantPrice ? `Precio base: S/ ${variantPrice}` : undefined}
				placeholder={variantPrice || "0.00"}
				decimals={2}
				data-testid="calculator-price-per-kg"
				value={pricePerKg}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("pricePerKg", e.target.value)}
			/>

			<div className="col-span-2 space-y-2">
				<label className="text-xs font-medium">Bruto (kg)</label>
				<div className="grid grid-cols-[minmax(110px,1fr)_minmax(150px,1fr)] gap-2 items-start">
				<FormCalculatorInput
					name="kilos"
					placeholder="0.000"
					className="w-full"
					decimals={3}
					data-testid="calculator-kilos"
					label={undefined}
					value={kilos}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("kilos", e.target.value)}
				/>
					<OCRButton onResult={handleOCRResult} />
				</div>
			</div>

			{!hideTara && (
				<FormCalculatorInput
					name="tara"
					label="Tara (kg)"
					placeholder="0"
					decimals={3}
					data-testid="calculator-tara"
					value={tara}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("tara", e.target.value)}
				/>
			)}

			{kgNeto > 0 && (
				<div
					className="col-span-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200"
					data-testid="calculator-summary"
				>
					<div className="text-center">
						<p className="text-xs text-gray-500 uppercase">Neto</p>
						<p className="text-lg font-bold text-orange-600" data-testid="calculator-net-weight">
							{formatWeight(kgNeto)} kg
						</p>
					</div>
				</div>
			)}
		</>
	);
}

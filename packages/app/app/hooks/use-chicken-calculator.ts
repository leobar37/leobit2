import { useState, useEffect, useCallback, useMemo } from "react";

export interface CalculatorState {
	totalAmount: string;
	pricePerKg: string;
	kilos: string;
	tara: string;
}

export interface UseChickenCalculatorOptions {
	productPrice?: string;
}

export interface UseChickenCalculatorReturn {
	values: CalculatorState;
	activeField: string | null;
	setActiveField: (field: string | null) => void;
	kgNeto: number;
	filledCount: number;
	isReady: boolean;
	handleReset: () => void;
	handleChange: (field: keyof CalculatorState, value: string) => void;
}

const INITIAL_STATE: Omit<CalculatorState, "pricePerKg"> = {
	totalAmount: "",
	kilos: "",
	tara: "0",
};

/**
 * Hook to manage chicken calculator state and auto-calculation logic.
 * When any 2 of the 3 main fields (totalAmount, pricePerKg, kilos) are filled,
 * the third is automatically calculated.
 */
export function useChickenCalculator(
	options: UseChickenCalculatorOptions = {},
): UseChickenCalculatorReturn {
	const { productPrice } = options;

	const [values, setValues] = useState<CalculatorState>({
		...INITIAL_STATE,
		pricePerKg: productPrice || "",
	});

	const [activeField, setActiveField] = useState<string | null>(null);

	useEffect(() => {
		if (productPrice !== undefined) {
			setValues((prev) => ({ ...prev, pricePerKg: productPrice }));
		}
	}, [productPrice]);

	const kgNeto = useMemo(() => {
		return Math.max(
			0,
			(parseFloat(values.kilos) || 0) - (parseFloat(values.tara) || 0),
		);
	}, [values.kilos, values.tara]);

	const filledCount = useMemo(() => {
		return [
			values.totalAmount,
			values.pricePerKg,
			values.kilos,
		].filter(Boolean).length;
	}, [values.totalAmount, values.pricePerKg, values.kilos]);

	const isReady = filledCount >= 2;

	useEffect(() => {
		const { totalAmount, pricePerKg, kilos, tara } = values;
		const taraNum = parseFloat(tara) || 0;

		const filledFields = [
			totalAmount && "totalAmount",
			pricePerKg && "pricePerKg",
			kilos && "kilos",
		].filter(Boolean);

		if (filledFields.length === 2) {
			const total = parseFloat(totalAmount) || 0;
			const price = parseFloat(pricePerKg) || 0;
			const kg = parseFloat(kilos) || 0;
			const kgNetoValue = Math.max(0, kg - taraNum);

			if (!totalAmount && price > 0 && kgNetoValue > 0) {
				setValues((prev) => ({
					...prev,
					totalAmount: (price * kgNetoValue).toFixed(2),
				}));
			} else if (!pricePerKg && total > 0 && kgNetoValue > 0) {
				setValues((prev) => ({
					...prev,
					pricePerKg: (total / kgNetoValue).toFixed(2),
				}));
			} else if (!kilos && total > 0 && price > 0) {
				const kgBruto = total / price + taraNum;
				setValues((prev) => ({ ...prev, kilos: kgBruto.toFixed(3) }));
			}
		}
	}, [values.totalAmount, values.pricePerKg, values.kilos, values.tara]);

	const handleReset = useCallback(() => {
		setValues({
			...INITIAL_STATE,
			pricePerKg: productPrice || "",
		});
		setActiveField(null);
	}, [productPrice]);

	const handleChange = useCallback(
		(field: keyof CalculatorState, value: string) => {
			if (value && !/^\d*\.?\d*$/.test(value)) return;

			setValues((prev) => ({ ...prev, [field]: value }));
			setActiveField(field);
		},
		[],
	);

	return {
		values,
		activeField,
		setActiveField,
		kgNeto,
		filledCount,
		isReady,
		handleReset,
		handleChange,
	};
}

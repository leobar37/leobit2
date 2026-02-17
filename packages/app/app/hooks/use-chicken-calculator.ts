import { useState, useEffect, useCallback, useMemo } from "react";

export interface CalculatorState {
	totalAmount: string;
	pricePerKg: string;
	kilos: string;
	tara: string;
}

export interface UseChickenCalculatorOptions {
	productPrice?: string;
	productId?: string;
	variantId?: string;
	persist?: boolean;
}

export interface CalculatorPersistence {
	lastProductId?: string;
	lastVariantId?: string;
	lastPricePerKg?: string;
	timestamp: number;
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
	persistSelection: (
		selectedProductId: string,
		selectedVariantId: string,
		pricePerKg?: string,
	) => void;
}

const STORAGE_KEY = "avileo-calculator-last";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function loadPersistedState(): CalculatorPersistence | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) {
			return null;
		}

		const parsed = JSON.parse(saved) as CalculatorPersistence;
		const age = Date.now() - parsed.timestamp;

		if (age > MAX_AGE_MS) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

export function getPersistedCalculatorSelection(): CalculatorPersistence | null {
	return loadPersistedState();
}

function resolveInitialPrice(
	productPrice: string | undefined,
	productId: string | undefined,
	variantId: string | undefined,
	persist: boolean,
): string {
	if (!persist) {
		return productPrice || "";
	}

	const persisted = loadPersistedState();
	if (!persisted) {
		return productPrice || "";
	}

	if (
		productId &&
		variantId &&
		persisted.lastProductId === productId &&
		persisted.lastVariantId === variantId &&
		persisted.lastPricePerKg
	) {
		return persisted.lastPricePerKg;
	}

	return productPrice || persisted.lastPricePerKg || "";
}

function savePersistedState(state: CalculatorPersistence): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		return;
	}
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
	const {
		productPrice,
		productId,
		variantId,
		persist = true,
	} = options;

	const [values, setValues] = useState<CalculatorState>({
		...INITIAL_STATE,
		pricePerKg: resolveInitialPrice(productPrice, productId, variantId, persist),
	});

	const [activeField, setActiveField] = useState<string | null>(null);

	useEffect(() => {
		if (productPrice !== undefined) {
			setValues((prev) => ({
				...prev,
				pricePerKg: resolveInitialPrice(productPrice, productId, variantId, persist),
			}));
		}
	}, [persist, productId, productPrice, variantId]);

	const persistSelection = useCallback(
		(selectedProductId: string, selectedVariantId: string, pricePerKg?: string) => {
			if (!persist) {
				return;
			}

			savePersistedState({
				lastProductId: selectedProductId,
				lastVariantId: selectedVariantId,
				lastPricePerKg: pricePerKg ?? values.pricePerKg,
				timestamp: Date.now(),
			});
		},
		[persist, values.pricePerKg],
	);

	useEffect(() => {
		if (!persist || !productId || !variantId || !values.pricePerKg) {
			return;
		}

		savePersistedState({
			lastProductId: productId,
			lastVariantId: variantId,
			lastPricePerKg: values.pricePerKg,
			timestamp: Date.now(),
		});
	}, [persist, productId, variantId, values.pricePerKg]);

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
		const price = parseFloat(pricePerKg) || 0;
		const kg = parseFloat(kilos) || 0;
		const kgNetoValue = Math.max(0, kg - taraNum);

		if (activeField === "tara" && price > 0 && kg > 0) {
			setValues((prev) => ({
				...prev,
				totalAmount: (price * kgNetoValue).toFixed(2),
			}));
			return;
		}

		const filledFields = [
			totalAmount && "totalAmount",
			pricePerKg && "pricePerKg",
			kilos && "kilos",
		].filter(Boolean);

		if (filledFields.length === 2) {
			const total = parseFloat(totalAmount) || 0;

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
	}, [activeField, values.totalAmount, values.pricePerKg, values.kilos, values.tara]);

	const handleReset = useCallback(() => {
		setValues({
			...INITIAL_STATE,
			pricePerKg: resolveInitialPrice(productPrice, productId, variantId, persist),
		});
		setActiveField(null);
	}, [persist, productId, productPrice, variantId]);

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
		persistSelection,
	};
}

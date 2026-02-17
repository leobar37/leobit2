import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
	useChickenCalculator,
	type UseChickenCalculatorOptions,
} from "./use-chicken-calculator";

describe("useChickenCalculator", () => {
	beforeEach(() => {
		if (typeof localStorage !== "undefined") {
			localStorage.clear();
		}
	});

	const renderCalculator = (options: UseChickenCalculatorOptions = {}) => {
		return renderHook(() => useChickenCalculator(options));
	};

	describe("initial state", () => {
		it("should initialize with empty values", () => {
			const { result } = renderCalculator();

			expect(result.current.values).toEqual({
				totalAmount: "",
				pricePerKg: "",
				kilos: "",
				tara: "0",
			});
		});

		it("should use productPrice as initial pricePerKg when provided", () => {
			const { result } = renderCalculator({ productPrice: "15.50" });

			expect(result.current.values.pricePerKg).toBe("15.50");
		});

		it("should have kgNeto of 0 initially", () => {
			const { result } = renderCalculator();

			expect(result.current.kgNeto).toBe(0);
		});

		it("should have filledCount of 0 initially", () => {
			const { result } = renderCalculator();

			expect(result.current.filledCount).toBe(0);
		});

		it("should have isReady false initially", () => {
			const { result } = renderCalculator();

			expect(result.current.isReady).toBe(false);
		});
	});

	describe("field updates", () => {
		it("should update totalAmount field", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "100.50");
			});

			expect(result.current.values.totalAmount).toBe("100.50");
		});

		it("should update pricePerKg field", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("pricePerKg", "15.00");
			});

			expect(result.current.values.pricePerKg).toBe("15.00");
		});

		it("should update kilos field", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("kilos", "5.500");
			});

			expect(result.current.values.kilos).toBe("5.500");
		});

		it("should update tara field", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("tara", "0.500");
			});

			expect(result.current.values.tara).toBe("0.500");
		});

		it("should set activeField on change", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("kilos", "5.0");
			});

			expect(result.current.activeField).toBe("kilos");
		});

		it("should reject invalid characters (non-numeric)", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "abc");
			});

			expect(result.current.values.totalAmount).toBe("");
		});

		it("should allow decimal point", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "10.50");
			});

			expect(result.current.values.totalAmount).toBe("10.50");
		});

		it("should allow empty string", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "10");
			});

			act(() => {
				result.current.handleChange("totalAmount", "");
			});

			expect(result.current.values.totalAmount).toBe("");
		});
	});

	describe("auto-calculation", () => {
		it("should calculate totalAmount when pricePerKg and kilos are set", async () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("pricePerKg", "10");
			});

			act(() => {
				result.current.handleChange("kilos", "5");
			});

			await waitFor(() => {
				expect(result.current.values.totalAmount).toBe("50.00");
			});
		});

		it("should calculate pricePerKg when totalAmount and kilos are set", async () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "100");
			});

			act(() => {
				result.current.handleChange("kilos", "5");
			});

			await waitFor(() => {
				expect(result.current.values.pricePerKg).toBe("20.00");
			});
		});

		it("should calculate kilos when totalAmount and pricePerKg are set", async () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "75");
			});

			act(() => {
				result.current.handleChange("pricePerKg", "15");
			});

			await waitFor(() => {
				expect(result.current.values.kilos).toBe("5.000");
			});
		});

		it("should account for tara when calculating", async () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("pricePerKg", "10");
			});

			act(() => {
				result.current.handleChange("kilos", "5.5");
			});

			act(() => {
				result.current.handleChange("tara", "0.5");
			});

			await waitFor(() => {
				expect(result.current.values.totalAmount).toBe("50.00");
			});
		});
	});

	describe("kgNeto calculation", () => {
		it("should calculate kgNeto correctly", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("kilos", "10");
			});

			act(() => {
				result.current.handleChange("tara", "2");
			});

			expect(result.current.kgNeto).toBe(8);
		});

		it("should never return negative kgNeto", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("kilos", "1");
			});

			act(() => {
				result.current.handleChange("tara", "5");
			});

			expect(result.current.kgNeto).toBe(0);
		});
	});

		describe("filledCount and isReady", () => {
		it("should count filled fields among main fields", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "100");
			});

			expect(result.current.filledCount).toBe(1);
			expect(result.current.isReady).toBe(false);
		});

		it("should be ready when 2 fields are filled", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "100");
			});

			act(() => {
				result.current.handleChange("pricePerKg", "10");
			});

			expect(result.current.filledCount).toBe(3);
			expect(result.current.isReady).toBe(true);
		});

		it("should be ready when all 3 fields are filled", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "100");
			});

			act(() => {
				result.current.handleChange("pricePerKg", "10");
			});

			act(() => {
				result.current.handleChange("kilos", "10");
			});

			expect(result.current.filledCount).toBe(3);
			expect(result.current.isReady).toBe(true);
		});

		it("should not count tara in filledCount", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("tara", "1");
			});

			expect(result.current.filledCount).toBe(0);
		});
	});

	describe("reset functionality", () => {
		it("should reset all fields to initial state", () => {
			const { result } = renderCalculator({ productPrice: "15.00" });

			act(() => {
				result.current.handleChange("totalAmount", "100");
				result.current.handleChange("pricePerKg", "20");
				result.current.handleChange("kilos", "5");
				result.current.handleChange("tara", "1");
			});

			act(() => {
				result.current.handleReset();
			});

			expect(result.current.values).toEqual({
				totalAmount: "",
				pricePerKg: "15.00",
				kilos: "",
				tara: "0",
			});
		});

		it("should reset activeField to null", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("kilos", "5");
			});

			act(() => {
				result.current.handleReset();
			});

			expect(result.current.activeField).toBeNull();
		});

		it("should reset filledCount to 0", () => {
			const { result } = renderCalculator();

			act(() => {
				result.current.handleChange("totalAmount", "100");
			});

			act(() => {
				result.current.handleReset();
			});

			expect(result.current.filledCount).toBe(0);
		});
	});

	describe("productPrice prop updates", () => {
		it("should update pricePerKg when productPrice prop changes", async () => {
			const { result, rerender } = renderHook(
				({ productPrice }: { productPrice: string }) =>
					useChickenCalculator({ productPrice }),
				{
					initialProps: { productPrice: "10.00" },
				},
			);

			expect(result.current.values.pricePerKg).toBe("10.00");

			rerender({ productPrice: "15.00" });

			await waitFor(() => {
				expect(result.current.values.pricePerKg).toBe("15.00");
			});
		});
	});

		describe("persistence", () => {
		it("should load persisted price when productPrice is not provided", () => {
			if (typeof localStorage === "undefined") return;

			localStorage.setItem(
				"avileo-calculator-last",
				JSON.stringify({
					lastProductId: "p-1",
					lastVariantId: "v-1",
					lastPricePerKg: "18.50",
					timestamp: Date.now(),
				}),
			);

			const { result } = renderCalculator();
			expect(result.current.values.pricePerKg).toBe("18.50");
		});

		it("should persist selection manually", () => {
			if (typeof localStorage === "undefined") return;

			const { result } = renderCalculator();

			act(() => {
				result.current.persistSelection("p-2", "v-2", "19.90");
			});

			const saved = localStorage.getItem("avileo-calculator-last");
			expect(saved).toBeTruthy();

			const parsed = JSON.parse(saved as string) as {
				lastProductId?: string;
				lastVariantId?: string;
				lastPricePerKg?: string;
			};

			expect(parsed.lastProductId).toBe("p-2");
			expect(parsed.lastVariantId).toBe("v-2");
			expect(parsed.lastPricePerKg).toBe("19.90");
		});

		it("should persist current variant and price automatically", async () => {
			if (typeof localStorage === "undefined") return;

			const { result } = renderCalculator({
				productId: "p-3",
				variantId: "v-3",
				productPrice: "21.00",
			});

			await waitFor(() => {
				const saved = localStorage.getItem("avileo-calculator-last");
				expect(saved).toBeTruthy();
			});

			const parsed = JSON.parse(
				localStorage.getItem("avileo-calculator-last") as string,
			) as {
				lastProductId?: string;
				lastVariantId?: string;
				lastPricePerKg?: string;
			};

			expect(parsed.lastProductId).toBe("p-3");
			expect(parsed.lastVariantId).toBe("v-3");
			expect(parsed.lastPricePerKg).toBe("21.00");
			expect(result.current.values.pricePerKg).toBe("21.00");
		});

		it("should prefer persisted price for the same product and variant", () => {
			if (typeof localStorage === "undefined") return;

			localStorage.setItem(
				"avileo-calculator-last",
				JSON.stringify({
					lastProductId: "p-10",
					lastVariantId: "v-10",
					lastPricePerKg: "22.70",
					timestamp: Date.now(),
				}),
			);

			const { result } = renderCalculator({
				productId: "p-10",
				variantId: "v-10",
				productPrice: "19.00",
			});

			expect(result.current.values.pricePerKg).toBe("22.70");
		});
	});
});

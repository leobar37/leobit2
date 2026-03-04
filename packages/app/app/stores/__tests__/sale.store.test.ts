import { describe, it, expect, beforeEach } from "vitest";
import type { CartItem, PaymentMode } from "~/lib/sales/types";
import type { Customer } from "~/lib/db/schema";
import {
	useSaleStore,
	getTotalAmount,
	getTotalNetoKg,
	getSaleType,
	getAmountPaidValue,
	getBalanceDue,
	getRequiresCustomer,
	getHasValidPartialAmount,
	getCanSubmit,
} from "../sale.store";

// Test fixtures
const createCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
	productId: "prod-1",
	variantId: "var-1",
	productName: "Product Test",
	variantName: "Variant Test",
	unit: "kg",
	variantUnitQuantity: 1,
	quantity: 1,
	unitPrice: 10,
	subtotal: 10,
	...overrides,
});

const createCustomer = (overrides: Partial<Customer> = {}): Customer => ({
	id: "cust-1",
	name: "Test Customer",
	dni: "12345678",
	phone: "999999999",
	address: "Test Address",
	notes: null,
	businessId: "biz-1",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	syncStatus: "synced",
	...overrides,
});

describe("sale.store - Pure Functions", () => {
	describe("getTotalAmount", () => {
		it("should return 0 for empty cart", () => {
			expect(getTotalAmount([])).toBe(0);
		});

		it("should sum all item subtotals", () => {
			const items = [
				createCartItem({ subtotal: 10 }),
				createCartItem({ subtotal: 20 }),
				createCartItem({ subtotal: 30 }),
			];
			expect(getTotalAmount(items)).toBe(60);
		});

		it("should handle decimal values correctly", () => {
			const items = [
				createCartItem({ subtotal: 10.5 }),
				createCartItem({ subtotal: 20.25 }),
			];
			expect(getTotalAmount(items)).toBe(30.75);
		});
	});

	describe("getTotalNetoKg", () => {
		it("should return 0 for empty cart", () => {
			expect(getTotalNetoKg([])).toBe(0);
		});

		it("should sum only kg items", () => {
			const items = [
				createCartItem({ unit: "kg", quantity: 5 }),
				createCartItem({ unit: "kg", quantity: 3 }),
				createCartItem({ unit: "unidad", quantity: 10 }),
			];
			expect(getTotalNetoKg(items)).toBe(8);
		});

		it("should return 0 when no kg items", () => {
			const items = [
				createCartItem({ unit: "unidad", quantity: 5 }),
				createCartItem({ unit: "unidad", quantity: 3 }),
			];
			expect(getTotalNetoKg(items)).toBe(0);
		});
	});

	describe("getSaleType", () => {
		it("should return 'contado' for pago_total", () => {
			expect(getSaleType("pago_total")).toBe("contado");
		});

		it("should return 'credito' for a_cuenta", () => {
			expect(getSaleType("a_cuenta")).toBe("credito");
		});

		it("should return 'credito' for debe_todo", () => {
			expect(getSaleType("debe_todo")).toBe("credito");
		});
	});

	describe("getAmountPaidValue", () => {
		it("should return totalAmount for pago_total", () => {
			expect(getAmountPaidValue("pago_total", 100, "")).toBe(100);
			expect(getAmountPaidValue("pago_total", 100, "50")).toBe(100);
		});

		it("should return 0 for debe_todo", () => {
			expect(getAmountPaidValue("debe_todo", 100, "")).toBe(0);
			expect(getAmountPaidValue("debe_todo", 100, "50")).toBe(0);
		});

		it("should parse amountPaid for a_cuenta", () => {
			expect(getAmountPaidValue("a_cuenta", 100, "50")).toBe(50);
			expect(getAmountPaidValue("a_cuenta", 100, "0")).toBe(0);
		});

		it("should return 0 for invalid amountPaid", () => {
			expect(getAmountPaidValue("a_cuenta", 100, "")).toBe(0);
			expect(getAmountPaidValue("a_cuenta", 100, "abc")).toBe(0);
		});
	});

	describe("getBalanceDue", () => {
		it("should return 0 for contado", () => {
			expect(getBalanceDue("contado", 100, 100)).toBe(0);
			expect(getBalanceDue("contado", 100, 50)).toBe(0);
		});

		it("should calculate difference for credito", () => {
			expect(getBalanceDue("credito", 100, 30)).toBe(70);
			expect(getBalanceDue("credito", 100, 100)).toBe(0);
		});

		it("should not return negative balance", () => {
			expect(getBalanceDue("credito", 100, 150)).toBe(0);
		});
	});

	describe("getRequiresCustomer", () => {
		it("should return false for contado", () => {
			expect(getRequiresCustomer("contado")).toBe(false);
		});

		it("should return true for credito", () => {
			expect(getRequiresCustomer("credito")).toBe(true);
		});
	});

	describe("getHasValidPartialAmount", () => {
		it("should return true for pago_total", () => {
			expect(getHasValidPartialAmount("pago_total", 0, 100)).toBe(true);
		});

		it("should return true for debe_todo", () => {
			expect(getHasValidPartialAmount("debe_todo", 0, 100)).toBe(true);
		});

		it("should return true for valid a_cuenta amount", () => {
			expect(getHasValidPartialAmount("a_cuenta", 50, 100)).toBe(true);
			expect(getHasValidPartialAmount("a_cuenta", 1, 100)).toBe(true);
			expect(getHasValidPartialAmount("a_cuenta", 100, 100)).toBe(true);
		});

		it("should return false for invalid a_cuenta amount", () => {
			expect(getHasValidPartialAmount("a_cuenta", 0, 100)).toBe(false);
			expect(getHasValidPartialAmount("a_cuenta", 101, 100)).toBe(false);
			expect(getHasValidPartialAmount("a_cuenta", -10, 100)).toBe(false);
		});
	});

	describe("getCanSubmit", () => {
		const customer = createCustomer();

		it("should return false when cart is empty", () => {
			expect(getCanSubmit(0, false, null, true)).toBe(false);
			expect(getCanSubmit(0, true, customer, true)).toBe(false);
		});

		it("should return true for contado with items", () => {
			expect(getCanSubmit(2, false, null, true)).toBe(true);
		});

		it("should return false for credito without customer", () => {
			expect(getCanSubmit(2, true, null, true)).toBe(false);
		});

		it("should return true for credito with customer", () => {
			expect(getCanSubmit(2, true, customer, true)).toBe(true);
		});

		it("should return false when partial amount is invalid", () => {
			expect(getCanSubmit(2, false, null, false)).toBe(false);
		});
	});
});

describe("sale.store - Store Actions", () => {
	beforeEach(() => {
		// Reset store before each test
		useSaleStore.getState().resetStore();
	});

	describe("addToCart", () => {
		it("should add new item to cart", () => {
			const item = createCartItem();
			useSaleStore.getState().addToCart(item);

			expect(useSaleStore.getState().cartItems).toHaveLength(1);
			expect(useSaleStore.getState().cartItems[0]).toEqual(item);
		});

		it("should merge quantities for same product/variant", () => {
			const item1 = createCartItem({ quantity: 2, subtotal: 20 });
			const item2 = createCartItem({ quantity: 3, subtotal: 30, unitPrice: 10 });

			useSaleStore.getState().addToCart(item1);
			useSaleStore.getState().addToCart(item2);

			expect(useSaleStore.getState().cartItems).toHaveLength(1);
			expect(useSaleStore.getState().cartItems[0].quantity).toBe(5);
			expect(useSaleStore.getState().cartItems[0].subtotal).toBe(50);
		});

		it("should add separate items for different products", () => {
			const item1 = createCartItem({ productId: "prod-1", variantId: "var-1" });
			const item2 = createCartItem({ productId: "prod-1", variantId: "var-2" });
			const item3 = createCartItem({ productId: "prod-2", variantId: "var-1" });

			useSaleStore.getState().addToCart(item1);
			useSaleStore.getState().addToCart(item2);
			useSaleStore.getState().addToCart(item3);

			expect(useSaleStore.getState().cartItems).toHaveLength(3);
		});
	});

	describe("removeFromCart", () => {
		it("should remove item by index", () => {
			const item1 = createCartItem({ productId: "prod-1" });
			const item2 = createCartItem({ productId: "prod-2" });
			const item3 = createCartItem({ productId: "prod-3" });

			useSaleStore.getState().addToCart(item1);
			useSaleStore.getState().addToCart(item2);
			useSaleStore.getState().addToCart(item3);

			useSaleStore.getState().removeFromCart(1);

			expect(useSaleStore.getState().cartItems).toHaveLength(2);
			expect(useSaleStore.getState().cartItems[0].productId).toBe("prod-1");
			expect(useSaleStore.getState().cartItems[1].productId).toBe("prod-3");
		});
	});

	describe("clearCart", () => {
		it("should remove all items from cart", () => {
			useSaleStore.getState().addToCart(createCartItem());
			useSaleStore.getState().addToCart(createCartItem({ productId: "prod-2" }));

			expect(useSaleStore.getState().cartItems).toHaveLength(2);

			useSaleStore.getState().clearCart();

			expect(useSaleStore.getState().cartItems).toHaveLength(0);
		});
	});

	describe("updateCartItem", () => {
		it("should update item at specific index", () => {
			useSaleStore.getState().addToCart(createCartItem({ quantity: 1, subtotal: 10 }));

			const updatedItem = createCartItem({ quantity: 5, subtotal: 50 });
			useSaleStore.getState().updateCartItem(0, updatedItem);

			expect(useSaleStore.getState().cartItems[0].quantity).toBe(5);
			expect(useSaleStore.getState().cartItems[0].subtotal).toBe(50);
		});
	});

	describe("payment configuration", () => {
		it("should set payment mode", () => {
			useSaleStore.getState().setPaymentMode("a_cuenta");
			expect(useSaleStore.getState().paymentMode).toBe("a_cuenta");

			useSaleStore.getState().setPaymentMode("debe_todo");
			expect(useSaleStore.getState().paymentMode).toBe("debe_todo");
		});

		it("should set amount paid", () => {
			useSaleStore.getState().setAmountPaid("50.50");
			expect(useSaleStore.getState().amountPaid).toBe("50.50");
		});
	});

	describe("customer selection", () => {
		it("should set selected customer", () => {
			const customer = createCustomer();
			useSaleStore.getState().setSelectedCustomer(customer);

			expect(useSaleStore.getState().selectedCustomer).toEqual(customer);
		});

		it("should clear selected customer", () => {
			useSaleStore.getState().setSelectedCustomer(createCustomer());
			useSaleStore.getState().setSelectedCustomer(null);

			expect(useSaleStore.getState().selectedCustomer).toBeNull();
		});
	});

	describe("submit error", () => {
		it("should set and clear submit error", () => {
			useSaleStore.getState().setSubmitError("Error message");
			expect(useSaleStore.getState().submitError).toBe("Error message");

			useSaleStore.getState().setSubmitError(null);
			expect(useSaleStore.getState().submitError).toBeNull();
		});
	});

	describe("product selection", () => {
		it("should set product and variant selection", () => {
			useSaleStore.getState().setSelection("prod-1", "var-1");

			expect(useSaleStore.getState().selectedProductId).toBe("prod-1");
			expect(useSaleStore.getState().selectedVariantId).toBe("var-1");
		});

		it("should clear selection", () => {
			useSaleStore.getState().setSelection("prod-1", "var-1");
			useSaleStore.getState().clearSelection();

			expect(useSaleStore.getState().selectedProductId).toBeNull();
			expect(useSaleStore.getState().selectedVariantId).toBeNull();
		});
	});

	describe("resetStore", () => {
		it("should reset all state to initial values", () => {
			// Set various states
			useSaleStore.getState().addToCart(createCartItem());
			useSaleStore.getState().setPaymentMode("a_cuenta");
			useSaleStore.getState().setAmountPaid("50");
			useSaleStore.getState().setSelectedCustomer(createCustomer());
			useSaleStore.getState().setSubmitError("Error");
			useSaleStore.getState().setSelection("prod-1", "var-1");

			// Reset
			useSaleStore.getState().resetStore();

			// Verify initial state
			expect(useSaleStore.getState().cartItems).toHaveLength(0);
			expect(useSaleStore.getState().paymentMode).toBe("pago_total");
			expect(useSaleStore.getState().amountPaid).toBe("");
			expect(useSaleStore.getState().selectedCustomer).toBeNull();
			expect(useSaleStore.getState().submitError).toBeNull();
			expect(useSaleStore.getState().selectedProductId).toBeNull();
			expect(useSaleStore.getState().selectedVariantId).toBeNull();
		});
	});
});

describe("sale.store - Integration Flows", () => {
	beforeEach(() => {
		useSaleStore.getState().resetStore();
	});

	describe("Cash Sale Flow (pago_total)", () => {
		it("should allow submitting cash sale with items", () => {
			// Add items
			useSaleStore.getState().addToCart(createCartItem({ subtotal: 50 }));
			useSaleStore.getState().addToCart(createCartItem({ productId: "prod-2", subtotal: 30 }));

			const state = useSaleStore.getState();
			const total = getTotalAmount(state.cartItems);
			const saleType = getSaleType(state.paymentMode);
			const requiresCustomer = getRequiresCustomer(saleType);
			const canSubmit = getCanSubmit(
				state.cartItems.length,
				requiresCustomer,
				state.selectedCustomer,
				true,
			);

			expect(total).toBe(80);
			expect(saleType).toBe("contado");
			expect(requiresCustomer).toBe(false);
			expect(canSubmit).toBe(true);
		});
	});

	describe("Credit Sale Flow (debe_todo)", () => {
		it("should block submission without customer", () => {
			useSaleStore.getState().addToCart(createCartItem({ subtotal: 100 }));
			useSaleStore.getState().setPaymentMode("debe_todo");

			const state = useSaleStore.getState();
			const saleType = getSaleType(state.paymentMode);
			const requiresCustomer = getRequiresCustomer(saleType);
			const canSubmit = getCanSubmit(
				state.cartItems.length,
				requiresCustomer,
				state.selectedCustomer,
				true,
			);

			expect(saleType).toBe("credito");
			expect(requiresCustomer).toBe(true);
			expect(canSubmit).toBe(false);
		});

		it("should allow submission with customer", () => {
			useSaleStore.getState().addToCart(createCartItem({ subtotal: 100 }));
			useSaleStore.getState().setPaymentMode("debe_todo");
			useSaleStore.getState().setSelectedCustomer(createCustomer());

			const state = useSaleStore.getState();
			const saleType = getSaleType(state.paymentMode);
			const requiresCustomer = getRequiresCustomer(saleType);
			const canSubmit = getCanSubmit(
				state.cartItems.length,
				requiresCustomer,
				state.selectedCustomer,
				true,
			);

			expect(saleType).toBe("credito");
			expect(requiresCustomer).toBe(true);
			expect(canSubmit).toBe(true);
		});
	});

	describe("Partial Payment Flow (a_cuenta)", () => {
		it("should calculate correct balance due with valid partial payment", () => {
			useSaleStore.getState().addToCart(createCartItem({ subtotal: 100 }));
			useSaleStore.getState().setPaymentMode("a_cuenta");
			useSaleStore.getState().setAmountPaid("30");
			useSaleStore.getState().setSelectedCustomer(createCustomer());

			const state = useSaleStore.getState();
			const total = getTotalAmount(state.cartItems);
			const amountPaidValue = getAmountPaidValue(state.paymentMode, total, state.amountPaid);
			const saleType = getSaleType(state.paymentMode);
			const balanceDue = getBalanceDue(saleType, total, amountPaidValue);
			const hasValidPartial = getHasValidPartialAmount(state.paymentMode, amountPaidValue, total);

			expect(total).toBe(100);
			expect(amountPaidValue).toBe(30);
			expect(balanceDue).toBe(70);
			expect(hasValidPartial).toBe(true);
		});

		it("should block submission with invalid partial payment amount", () => {
			useSaleStore.getState().addToCart(createCartItem({ subtotal: 100 }));
			useSaleStore.getState().setPaymentMode("a_cuenta");
			useSaleStore.getState().setAmountPaid("150"); // More than total
			useSaleStore.getState().setSelectedCustomer(createCustomer());

			const state = useSaleStore.getState();
			const total = getTotalAmount(state.cartItems);
			const amountPaidValue = getAmountPaidValue(state.paymentMode, total, state.amountPaid);
			const hasValidPartial = getHasValidPartialAmount(state.paymentMode, amountPaidValue, total);
			const saleType = getSaleType(state.paymentMode);
			const requiresCustomer = getRequiresCustomer(saleType);
			const canSubmit = getCanSubmit(
				state.cartItems.length,
				requiresCustomer,
				state.selectedCustomer,
				hasValidPartial,
			);

			expect(hasValidPartial).toBe(false);
			expect(canSubmit).toBe(false);
		});

		it("should block submission with zero partial payment", () => {
			useSaleStore.getState().addToCart(createCartItem({ subtotal: 100 }));
			useSaleStore.getState().setPaymentMode("a_cuenta");
			useSaleStore.getState().setAmountPaid("0");
			useSaleStore.getState().setSelectedCustomer(createCustomer());

			const state = useSaleStore.getState();
			const total = getTotalAmount(state.cartItems);
			const amountPaidValue = getAmountPaidValue(state.paymentMode, total, state.amountPaid);
			const hasValidPartial = getHasValidPartialAmount(state.paymentMode, amountPaidValue, total);

			expect(hasValidPartial).toBe(false);
		});
	});

	describe("Complete Sale Flow", () => {
		it("should handle full cash sale lifecycle", () => {
			// 1. Add items to cart
			useSaleStore.getState().addToCart(createCartItem({ subtotal: 50 }));
			useSaleStore.getState().addToCart(createCartItem({ productId: "prod-2", subtotal: 75.5 }));

			// 2. Verify totals
			const state = useSaleStore.getState();
			const total = getTotalAmount(state.cartItems);
			expect(total).toBe(125.5);

			// 3. Verify can submit
			const saleType = getSaleType(state.paymentMode);
			const requiresCustomer = getRequiresCustomer(saleType);
			const canSubmit = getCanSubmit(
				state.cartItems.length,
				requiresCustomer,
				state.selectedCustomer,
				true,
			);
			expect(canSubmit).toBe(true);

			// 4. Submit sale (clear cart)
			useSaleStore.getState().clearCart();
			expect(useSaleStore.getState().cartItems).toHaveLength(0);
		});

		it("should handle full credit sale lifecycle", () => {
			// 1. Add items
			useSaleStore.getState().addToCart(createCartItem({ subtotal: 200 }));

			// 2. Set to credit with partial payment
			useSaleStore.getState().setPaymentMode("a_cuenta");
			useSaleStore.getState().setAmountPaid("50");

			// 3. Try to submit without customer - should fail
			let state = useSaleStore.getState();
			let saleType = getSaleType(state.paymentMode);
			let requiresCustomer = getRequiresCustomer(saleType);
			let canSubmit = getCanSubmit(
				state.cartItems.length,
				requiresCustomer,
				state.selectedCustomer,
				true,
			);
			expect(canSubmit).toBe(false);

			// 4. Select customer
			useSaleStore.getState().setSelectedCustomer(createCustomer());

			// 5. Now should be able to submit
			state = useSaleStore.getState();
			const total = getTotalAmount(state.cartItems);
			const amountPaidValue = getAmountPaidValue(state.paymentMode, total, state.amountPaid);
			saleType = getSaleType(state.paymentMode);
			const balanceDue = getBalanceDue(saleType, total, amountPaidValue);
			requiresCustomer = getRequiresCustomer(saleType);
			canSubmit = getCanSubmit(
				state.cartItems.length,
				requiresCustomer,
				state.selectedCustomer,
				true,
			);

			expect(total).toBe(200);
			expect(amountPaidValue).toBe(50);
			expect(balanceDue).toBe(150);
			expect(canSubmit).toBe(true);
		});
	});
});

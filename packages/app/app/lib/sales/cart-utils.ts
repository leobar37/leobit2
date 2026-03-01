import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import type { AddFromCalculatorParams, CartItem } from "~/lib/sales/types";

function parseNumber(value: string): number {
  return parseFloat(value) || 0;
}

function upsertCartItem(cartItems: CartItem[], nextItem: CartItem): CartItem[] {
  const existingIndex = cartItems.findIndex(
    (item) => item.productId === nextItem.productId && item.variantId === nextItem.variantId,
  );

  if (existingIndex < 0) {
    return [...cartItems, nextItem];
  }

  return cartItems.map((item, index) => {
    if (index !== existingIndex) {
      return item;
    }

    const quantity = item.quantity + nextItem.quantity;
    const unitPrice = nextItem.unitPrice;
    return {
      ...item,
      quantity,
      unitPrice,
      subtotal: parseFloat((quantity * unitPrice).toFixed(2)),
    };
  });
}

function parseVariantUnitQuantity(variant: ProductVariant): number {
  return Math.max(1, parseNumber(variant.unitQuantity || "1") || 1);
}

function createKgCartItem(
  selectedProduct: Product,
  selectedVariant: ProductVariant,
  kgNeto: number,
  unitPrice: number,
  totalAmount: string,
): CartItem | null {
  if (kgNeto <= 0 || unitPrice <= 0) {
    return null;
  }

  // Calculate subtotal from quantity * unitPrice, rounded to 2 decimals
  const subtotal = parseFloat((kgNeto * unitPrice).toFixed(2));
  
  if (subtotal <= 0) {
    return null;
  }

  return {
    productId: selectedProduct.id,
    variantId: selectedVariant.id,
    productName: selectedProduct.name,
    variantName: selectedVariant.name,
    unit: "kg",
    variantUnitQuantity: 1,
    quantity: kgNeto,
    unitPrice,
    subtotal,
  };
}

function createUnidadCartItem(
  selectedProduct: Product,
  selectedVariant: ProductVariant,
  values: { totalAmount: string },
  packsInput: string,
  unitsInput: string,
): CartItem | null {
  const unitQuantity = parseVariantUnitQuantity(selectedProduct);
  const variantPrice = parseNumber(selectedVariant.price || "0");

  const packs = parseNumber(packsInput);
  const units = parseNumber(unitsInput);
  const quantityUnits = packs > 0 ? packs * unitQuantity : units;

  if (quantityUnits <= 0) {
    return null;
  }

  const totalFromInput = parseNumber(values.totalAmount);
  
  // Calculate initial subtotal from input or from quantity * price
  const initialSubtotal = totalFromInput > 0
    ? totalFromInput
    : packs > 0
      ? packs * variantPrice
      : quantityUnits * (unitQuantity > 0 ? variantPrice / unitQuantity : 0);

  // When user enters custom total, recalculate unit price from subtotal
  // Round to 2 decimal places to match backend behavior
  const recalculatedUnitPrice = quantityUnits > 0 
    ? parseFloat((initialSubtotal / quantityUnits).toFixed(2)) 
    : 0;

  // Ensure subtotal is exactly quantity * unitPrice (to match backend calculation)
  const finalSubtotal = parseFloat((quantityUnits * recalculatedUnitPrice).toFixed(2));

  if (finalSubtotal <= 0 || recalculatedUnitPrice <= 0) {
    return null;
  }

  return {
    productId: selectedProduct.id,
    variantId: selectedVariant.id,
    productName: selectedProduct.name,
    variantName: selectedVariant.name,
    unit: "unidad",
    variantUnitQuantity: unitQuantity,
    quantity: quantityUnits,
    unitPrice: recalculatedUnitPrice,
    subtotal: finalSubtotal,
  };
}

export function isNumericText(value: string): boolean {
  return !value || /^\d*\.?\d*$/.test(value);
}

export function addFromCalculator(params: AddFromCalculatorParams): CartItem[] {
  const {
    cartItems,
    selectedProduct,
    selectedVariant,
    values,
    kgNeto,
    packsInput,
    unitsInput,
  } = params;

  if (selectedProduct.unit === "unidad") {
    const nextItem = createUnidadCartItem(
      selectedProduct,
      selectedVariant,
      values,
      packsInput,
      unitsInput,
    );
    return nextItem ? upsertCartItem(cartItems, nextItem) : cartItems;
  }

  const unitPrice = parseNumber(values.pricePerKg || selectedVariant.price || "0");
  const nextItem = createKgCartItem(
    selectedProduct,
    selectedVariant,
    kgNeto,
    unitPrice,
    values.totalAmount,
  );

  return nextItem ? upsertCartItem(cartItems, nextItem) : cartItems;
}

export function removeFromCart(cartItems: CartItem[], index: number): CartItem[] {
  return cartItems.filter((_, itemIndex) => itemIndex !== index);
}

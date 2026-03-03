import type { PurchaseCartItem } from "~/stores/purchase.store";

export interface PurchaseCalculationInput {
  packs?: number;
  quantity: number;
  unitCost: number;
  totalAmount: string;
}

export interface PurchaseCalculationResult {
  quantity: number;
  unitCost: number;
  subtotal: number;
  isValid: boolean;
}

/**
 * Calculate purchase values from input
 * Auto-calculates missing fields based on user input
 */
export function calculatePurchase(
  input: PurchaseCalculationInput,
  baseUnitQuantity?: number
): PurchaseCalculationResult {
  const packs = input.packs || 0;
  const quantity = input.quantity || 0;
  const unitCost = input.unitCost || 0;
  const totalFromInput = parseFloat(input.totalAmount) || 0;

  // Calculate effective quantity (packs or direct)
  let effectiveQuantity = 0;
  if (packs > 0 && baseUnitQuantity) {
    effectiveQuantity = packs * baseUnitQuantity;
  } else if (quantity > 0) {
    effectiveQuantity = quantity;
  }

  // Determine subtotal
  let subtotal = 0;

  if (totalFromInput > 0 && effectiveQuantity > 0) {
    // User entered total, calculate unit cost
    subtotal = totalFromInput;
  } else if (effectiveQuantity > 0 && unitCost > 0) {
    subtotal = parseFloat((effectiveQuantity * unitCost).toFixed(2));
  }

  // Calculate unit cost from subtotal if needed
  let finalUnitCost = unitCost;
  if (subtotal > 0 && effectiveQuantity > 0 && unitCost === 0) {
    finalUnitCost = parseFloat((subtotal / effectiveQuantity).toFixed(2));
  }

  return {
    quantity: effectiveQuantity,
    unitCost: finalUnitCost,
    subtotal,
    isValid: effectiveQuantity > 0 && subtotal > 0,
  };
}

/**
 * Create a purchase cart item from calculation result
 */
export function createPurchaseCartItem(
  productId: string,
  productName: string,
  variantId: string | undefined,
  variantName: string | undefined,
  unitId: string | undefined,
  unitName: string | undefined,
  packs: number | undefined,
  calculation: PurchaseCalculationResult
): PurchaseCartItem | null {
  if (!calculation.isValid) {
    return null;
  }

  return {
    productId,
    variantId,
    unitId,
    productName,
    variantName,
    unitName,
    packs,
    quantity: calculation.quantity,
    unitCost: calculation.unitCost,
    subtotal: calculation.subtotal,
  };
}

/**
 * Auto-calculate missing field in purchase calculator
 */
export function autoCalculatePurchaseField(
  values: PurchaseCalculationInput,
  activeField: "packs" | "quantity" | "unitCost" | "totalAmount" | null,
  baseUnitQuantity?: number
): Partial<PurchaseCalculationInput> {
  const packs = values.packs || 0;
  const quantity = values.quantity || 0;
  const unitCost = values.unitCost || 0;
  const total = parseFloat(values.totalAmount) || 0;

  // Calculate effective quantity
  let effectiveQuantity = 0;
  if (packs > 0 && baseUnitQuantity) {
    effectiveQuantity = packs * baseUnitQuantity;
  } else if (quantity > 0) {
    effectiveQuantity = quantity;
  }

  // If user is editing packs, recalculate quantity
  if (activeField === "packs" && baseUnitQuantity && packs > 0) {
    return {
      quantity: packs * baseUnitQuantity,
    };
  }

  // If user is editing quantity and has unit, recalculate packs
  if (activeField === "quantity" && baseUnitQuantity && quantity > 0) {
    const newPacks = quantity / baseUnitQuantity;
    if (Number.isInteger(newPacks)) {
      return {
        packs: newPacks,
      };
    }
  }

  // Calculate total if we have quantity and unit cost
  if (activeField === "unitCost" && effectiveQuantity > 0 && unitCost > 0) {
    return {
      totalAmount: (effectiveQuantity * unitCost).toFixed(2),
    };
  }

  if (activeField === "quantity" && unitCost > 0 && effectiveQuantity > 0) {
    return {
      totalAmount: (effectiveQuantity * unitCost).toFixed(2),
    };
  }

  // Calculate unit cost from total
  if (activeField === "totalAmount" && effectiveQuantity > 0 && total > 0) {
    return {
      unitCost: parseFloat((total / effectiveQuantity).toFixed(2)),
    };
  }

  return {};
}

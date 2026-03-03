import { useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePurchaseStore } from "~/stores/purchase.store";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import { useUnitsByProduct } from "~/hooks/use-product-units";
import {
  calculatePurchase,
  createPurchaseCartItem,
  autoCalculatePurchaseField,
} from "~/lib/purchases/calculator-logic";

const purchaseCalculatorSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto"),
  variantId: z.string().optional(),
  unitId: z.string().optional(),
  packs: z.number().optional(),
  quantity: z.number().optional(),
  unitCost: z.number().min(0, "El costo no puede ser negativo"),
  totalAmount: z.string().optional(),
});

export type PurchaseCalculatorData = z.infer<typeof purchaseCalculatorSchema>;

interface UsePurchaseCalculatorOptions {
  onAddToCart?: () => void;
}

interface UsePurchaseCalculatorReturn {
  // Form
  form: ReturnType<typeof useForm<PurchaseCalculatorData>>;
  formValues: Partial<PurchaseCalculatorData>;

  // Product data
  products: { id: string; name: string }[];
  isProductsLoading: boolean;
  selectedProductId: string;
  selectedVariantId: string;
  selectedUnitId: string;

  // Variant & Unit data
  variants: { id: string; name: string }[];
  units: { id: string; name: string; baseUnitQuantity: string }[];
  hasVariants: boolean;
  hasUnits: boolean;
  baseUnitQuantity?: number;

  // Computed
  calculation: {
    quantity: number;
    unitCost: number;
    subtotal: number;
    isValid: boolean;
  };
  isValid: boolean;

  // Actions
  handleClear: () => void;
  handleAddToCart: () => void;
  setFieldValue: (field: string, value: unknown) => void;
}

export function usePurchaseCalculator(
  options: UsePurchaseCalculatorOptions = {}
): UsePurchaseCalculatorReturn {
  const { onAddToCart } = options;
  const { addToCart, setSelection, clearSelection } = usePurchaseStore();

  // Products
  const { data: productsData, isLoading: isProductsLoading } = useProducts();
  const products = productsData?.map((p) => ({ id: p.id, name: p.name })) || [];

  // Form
  const form = useForm<PurchaseCalculatorData>({
    resolver: zodResolver(purchaseCalculatorSchema),
    defaultValues: {
      productId: "",
      variantId: undefined,
      unitId: undefined,
      packs: undefined,
      quantity: undefined,
      unitCost: 0,
      totalAmount: "",
    },
  });

  const formValues = useWatch({ control: form.control });
  const selectedProductId = formValues.productId || "";
  const selectedVariantId = formValues.variantId || "";
  const selectedUnitId = formValues.unitId || "";

  // Variants for selected product
  const { data: variantsData } = useVariantsByProduct(selectedProductId, {
    isActive: true,
  });
  const variants =
    variantsData?.map((v) => ({ id: v.id, name: v.name })) || [];
  const hasVariants = variants.length > 0;

  // Units for selected product
  const { data: unitsData } = useUnitsByProduct(selectedProductId, {
    isActive: true,
  });
  const units =
    unitsData?.map((u) => ({
      id: u.id,
      name: u.displayName,
      baseUnitQuantity: u.baseUnitQuantity,
    })) || [];
  const hasUnits = units.length > 0;

  // Get base unit quantity for calculations
  const selectedUnit = unitsData?.find((u) => u.id === selectedUnitId);
  const baseUnitQuantity = selectedUnit
    ? parseFloat(selectedUnit.baseUnitQuantity)
    : undefined;

  // Calculation
  const calculation = useMemo(() => {
    if (!selectedProductId) {
      return {
        quantity: 0,
        unitCost: 0,
        subtotal: 0,
        isValid: false,
      };
    }

    return calculatePurchase(
      {
        packs: formValues.packs,
        quantity: formValues.quantity || 0,
        unitCost: formValues.unitCost || 0,
        totalAmount: formValues.totalAmount || "",
      },
      baseUnitQuantity
    );
  }, [
    formValues.packs,
    formValues.quantity,
    formValues.unitCost,
    formValues.totalAmount,
    selectedProductId,
    baseUnitQuantity,
  ]);

  const isValid = calculation.isValid;

  // Clear form handler
  const handleClear = useCallback(() => {
    form.reset({
      productId: "",
      variantId: undefined,
      unitId: undefined,
      packs: undefined,
      quantity: undefined,
      unitCost: 0,
      totalAmount: "",
    });
    clearSelection();
  }, [form, clearSelection]);

  // Add to cart handler
  const handleAddToCart = useCallback(() => {
    if (!selectedProductId || !calculation.isValid) {
      return;
    }

    const selectedProduct = productsData?.find(
      (p) => p.id === selectedProductId
    );
    const selectedVariant = variantsData?.find(
      (v) => v.id === selectedVariantId
    );

    const cartItem = createPurchaseCartItem(
      selectedProductId,
      selectedProduct?.name || "Producto",
      selectedVariantId || undefined,
      selectedVariant?.name || undefined,
      selectedUnitId || undefined,
      selectedUnit?.displayName || undefined,
      formValues.packs,
      calculation
    );

    if (cartItem) {
      addToCart(cartItem);
      onAddToCart?.();
      handleClear();
    }
  }, [
    selectedProductId,
    selectedVariantId,
    selectedUnitId,
    productsData,
    variantsData,
    selectedUnit,
    formValues.packs,
    calculation,
    addToCart,
    onAddToCart,
    handleClear,
  ]);

  // Set field value with auto-calculation
  const setFieldValue = useCallback(
    (field: string, value: unknown) => {
      form.setValue(field as keyof PurchaseCalculatorData, value as never);

      // Auto-calculate related fields
      const currentValues = form.getValues();
      const calculated = autoCalculatePurchaseField(
        {
          packs: currentValues.packs,
          quantity: currentValues.quantity || 0,
          unitCost: currentValues.unitCost || 0,
          totalAmount: currentValues.totalAmount || "",
        },
        field === "packs" || field === "quantity" || field === "unitCost" || field === "totalAmount"
          ? field
          : null,
        baseUnitQuantity
      );

      Object.entries(calculated).forEach(([key, val]) => {
        form.setValue(key as keyof PurchaseCalculatorData, val as never);
      });
    },
    [form, baseUnitQuantity]
  );

  return {
    form,
    formValues,
    products,
    isProductsLoading,
    selectedProductId,
    selectedVariantId,
    selectedUnitId,
    variants,
    units,
    hasVariants,
    hasUnits,
    baseUnitQuantity,
    calculation,
    isValid,
    handleClear,
    handleAddToCart,
    setFieldValue,
  };
}

import { useState, useMemo, useCallback } from "react";
import { toDateString, addDays, now } from "~/lib/date-utils";
import type { Customer, Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { useCalculator } from "./use-order-calculator";

export interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  orderedQuantity: number;
  unitPriceQuoted: number;
}

export interface UseOrderFormOptions {
  onSubmit: (data: {
    clientId: string | null;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    totalAmount: number;
    items: OrderItem[];
  }) => void;
  onNavigateToCalculadora?: () => void;
  isSubmitting?: boolean;
}

export interface UseOrderFormReturn {
  // State
  selectedCustomer: Customer | null;
  deliveryDate: string;
  paymentIntent: "contado" | "credito";
  items: OrderItem[];
  isAnonymousCustomer: boolean;

  // UI State
  showVariantSelector: boolean;

  // Selected product/variant
  selectedProduct: Product | null;
  selectedVariant: ProductVariant | null;

  // Calculator
  calculator: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reset: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue: any;
    kgNeto: number;
    isValid: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: any;
  };

  // Computed
  totalAmount: number;
  isValid: boolean;
  isKgProduct: boolean;
  minDeliveryDate: string;
  isSubmitting: boolean;

  // Actions
  setSelectedCustomer: (customer: Customer | null) => void;
  setIsAnonymousCustomer: (isAnonymous: boolean) => void;
  setDeliveryDate: (date: string) => void;
  setPaymentIntent: (intent: "contado" | "credito") => void;
  setShowVariantSelector: (show: boolean) => void;
  handleVariantSelect: (product: Product, variant: ProductVariant) => void;
  // Called from the calculator route page when an item is confirmed
  handleAddItem: (onAddedToCart?: () => void) => void;
  handleRemoveItem: (index: number) => void;
  handleSubmit: () => void;
}

export function useOrderForm({
  onSubmit,
  onNavigateToCalculadora,
  isSubmitting = false,
}: UseOrderFormOptions): UseOrderFormReturn {
  // Main form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isAnonymousCustomer, setIsAnonymousCustomer] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentIntent, setPaymentIntent] =
    useState<"contado" | "credito">("contado");
  const [items, setItems] = useState<OrderItem[]>([]);

  // UI state
  const [showVariantSelector, setShowVariantSelector] = useState(false);

  // Selected product/variant for calculator
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariant | null>(null);

  // Calculator - uses shared hook
  const calculator = useCalculator({
    product: selectedProduct || undefined,
    variant: selectedVariant || undefined,
  });

  const { form, formValues, calculation, isKgProduct, handleClear, setFieldValue } = calculator;
  const { register, watch, reset } = form;

  // Computed values
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + item.orderedQuantity * item.unitPriceQuoted;
    }, 0);
  }, [items]);

  const isValid =
    (selectedCustomer !== null || isAnonymousCustomer) &&
    deliveryDate !== "" &&
    items.length > 0;

  // Min delivery date is tomorrow
  const minDeliveryDate = useMemo(
    () => toDateString(addDays(now(), 1)),
    [],
  );

  // Actions
  const handleVariantSelect = useCallback(
    (product: Product, variant: ProductVariant) => {
      setSelectedProduct(product);
      setSelectedVariant(variant);
      setShowVariantSelector(false);
      handleClear();
          onNavigateToCalculadora?.();
    },

    [handleClear, onNavigateToCalculadora],
  );

  const handleAddItem = useCallback((onAddedToCart?: () => void) => {
    if (!selectedProduct || !selectedVariant) return;

    if (!calculation.isValid) return;

    const item: OrderItem = {
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantName: selectedVariant.name,
      orderedQuantity: calculation.quantity,
      unitPriceQuoted: calculation.unitPrice,
    };

    setItems((prev) => [...prev, item]);
    setSelectedProduct(null);
    setSelectedVariant(null);
    handleClear();
    onAddedToCart?.();
  }, [
    selectedProduct,
    selectedVariant,
    calculation,
    handleClear,
  ]);

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if ((!selectedCustomer && !isAnonymousCustomer) || !deliveryDate || items.length === 0) return;

    onSubmit({
      clientId: isAnonymousCustomer ? null : selectedCustomer!.id,
      deliveryDate,
      paymentIntent,
      totalAmount,
      items,
    });
  }, [
    selectedCustomer,
    isAnonymousCustomer,
    deliveryDate,
    paymentIntent,
    totalAmount,
    items,
    onSubmit,
  ]);

  return {
    // State
    selectedCustomer,
    isAnonymousCustomer,
    deliveryDate,
    paymentIntent,
    items,

    // UI State
    showVariantSelector,

    // Selected product/variant
    selectedProduct,
    selectedVariant,

    // Calculator
    calculator: {
      register,
      watch,
      reset,
      setValue: setFieldValue,
      kgNeto: calculation.kgNeto,
      isValid: calculation.isValid,
      values: formValues,
    },

    // Computed
    totalAmount,
    isValid,
    isKgProduct,
    minDeliveryDate,
    isSubmitting,

    // Actions
    setSelectedCustomer,
    setIsAnonymousCustomer,
    setDeliveryDate,
    setPaymentIntent,
    setShowVariantSelector,
    handleVariantSelect,
    handleAddItem,
    handleRemoveItem,
    handleSubmit,
  };
}

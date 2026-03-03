import { useState, useMemo, useCallback, useEffect } from "react";
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
    clientId: string;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    totalAmount: number;
    items: OrderItem[];
  }) => void;
}

export interface UseOrderFormReturn {
  // State
  selectedCustomer: Customer | null;
  deliveryDate: string;
  paymentIntent: "contado" | "credito";
  items: OrderItem[];

  // UI State
  showItemForm: boolean;
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

  // Actions
  setSelectedCustomer: (customer: Customer | null) => void;
  setDeliveryDate: (date: string) => void;
  setPaymentIntent: (intent: "contado" | "credito") => void;
  setShowVariantSelector: (show: boolean) => void;
  setShowItemForm: (show: boolean) => void;
  handleVariantSelect: (product: Product, variant: ProductVariant) => void;
  handleAddItem: () => void;
  handleRemoveItem: (index: number) => void;
  handleSubmit: () => void;
}

export function useOrderForm({
  onSubmit,
}: UseOrderFormOptions): UseOrderFormReturn {
  // Main form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentIntent, setPaymentIntent] =
    useState<"contado" | "credito">("contado");
  const [items, setItems] = useState<OrderItem[]>([]);

  // UI state
  const [showItemForm, setShowItemForm] = useState(false);
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
    selectedCustomer !== null && deliveryDate !== "" && items.length > 0;

  // Min delivery date is tomorrow - using date-utils
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
      setShowItemForm(true);
      // Use handleClear from the calculator hook
      handleClear();
    },
    [handleClear, setShowVariantSelector, setShowItemForm],
  );

  const handleAddItem = useCallback(() => {
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
    setShowItemForm(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    // Use handleClear to reset form
    handleClear();
  }, [
    selectedProduct,
    selectedVariant,
    calculation,
    handleClear,
    setShowItemForm,
  ]);

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedCustomer || !deliveryDate || items.length === 0) return;

    onSubmit({
      clientId: selectedCustomer.id,
      deliveryDate,
      paymentIntent,
      totalAmount,
      items,
    });
  }, [
    selectedCustomer,
    deliveryDate,
    paymentIntent,
    totalAmount,
    items,
    onSubmit,
  ]);

  return {
    // State
    selectedCustomer,
    deliveryDate,
    paymentIntent,
    items,

    // UI State
    showItemForm,
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

    // Actions
    setSelectedCustomer,
    setDeliveryDate,
    setPaymentIntent,
    setShowVariantSelector,
    setShowItemForm,
    handleVariantSelect,
    handleAddItem,
    handleRemoveItem,
    handleSubmit,
  };
}

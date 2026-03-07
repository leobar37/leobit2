import { useState, useMemo, useCallback } from "react";
import { toDateString, addDays, now } from "~/lib/date-utils";
import type { Customer, Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { useCalculator } from "./use-order-calculator";
import { parseAmount, calculateBalanceDue, formatCurrency } from "~/lib/utils";

export interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  orderedQuantity: number;
  unitPriceQuoted: number;
}

export type PaymentMethod = "efectivo" | "yape" | "plin" | "transferencia";
export type PaymentStatus = "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";

export interface UseOrderFormOptions {
  onSubmit: (data: {
    clientId: string;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    paymentStatus?: PaymentStatus;
    advanceAmount?: number;
    balanceDue?: number;
    advancePaymentMethod?: PaymentMethod;
    advanceReferenceNumber?: string;
    totalAmount: number;
    items: OrderItem[];
  }) => void;
  onNavigateToCalculadora?: () => void;
  isSubmitting?: boolean;
  initialOrder?: {
    clientId: string;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    paymentStatus?: PaymentStatus;
    advanceAmount?: number;
    balanceDue?: number;
    advancePaymentMethod?: PaymentMethod;
    advanceReferenceNumber?: string;
    totalAmount: number;
    items: OrderItem[];
  };
}

export interface UseOrderFormReturn {
  // State
  selectedCustomer: Customer | null;
  deliveryDate: string;
  paymentIntent: "contado" | "credito";
  paymentStatus: PaymentStatus;
  advanceAmount: string;
  advancePaymentMethod: PaymentMethod | null;
  advanceReferenceNumber: string;
  items: OrderItem[];

  // UI State
  showVariantSelector: boolean;
  showAdvancePayment: boolean;
  editingItemIndex: number | null;

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
  balanceDue: number;
  isValid: boolean;
  isKgProduct: boolean;
  minDeliveryDate: string;
  isSubmitting: boolean;

  // Actions
  setSelectedCustomer: (customer: Customer | null) => void;
  setDeliveryDate: (date: string) => void;
  setPaymentIntent: (intent: "contado" | "credito") => void;
  setPaymentStatus: (status: PaymentStatus) => void;
  setAdvanceAmount: (amount: string) => void;
  setAdvancePaymentMethod: (method: PaymentMethod | null) => void;
  setAdvanceReferenceNumber: (ref: string) => void;
  setShowVariantSelector: (show: boolean) => void;
  setShowAdvancePayment: (show: boolean) => void;
  handleVariantSelect: (product: Product, variant: ProductVariant) => void;
  startEditingItem: (index: number) => void;
  handleUpdateItem: (onUpdated?: () => void) => void;
  // Called from the calculator route page when an item is confirmed
  handleAddItem: (onAddedToCart?: () => void) => void;
  handleRemoveItem: (index: number) => void;
  handleSubmit: () => void;
}

export function useOrderForm({
  onSubmit,
  onNavigateToCalculadora,
  isSubmitting = false,
  initialOrder,
}: UseOrderFormOptions): UseOrderFormReturn {
  // Main form state - initialize from initialOrder if provided
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [deliveryDate, setDeliveryDate] = useState(initialOrder?.deliveryDate || "");
  const [paymentIntent, setPaymentIntent] = useState<"contado" | "credito">(
    initialOrder?.paymentIntent || "contado",
  );
  const [items, setItems] = useState<OrderItem[]>(initialOrder?.items || []);

  // Track which item is being edited (for calculator)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Financial state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("sin_pago");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<PaymentMethod | null>(null);
  const [advanceReferenceNumber, setAdvanceReferenceNumber] = useState("");
  const [showAdvancePayment, setShowAdvancePayment] = useState(false);

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

  const balanceDue = useMemo(() => {
    const advance = parseAmount(advanceAmount);
    return calculateBalanceDue(totalAmount, advance);
  }, [totalAmount, advanceAmount]);

  const isValid =
    selectedCustomer !== null && deliveryDate !== "" && items.length > 0;

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

  const startEditingItem = useCallback((index: number) => {
    const item = items[index];
    if (!item) return;
    setEditingItemIndex(index);
    // Store item data for calculator to load full variant
    setSelectedProduct({ id: item.productId, name: item.productName } as Product);
    setSelectedVariant({ id: item.variantId, name: item.variantName, price: item.unitPriceQuoted } as unknown as ProductVariant);
    onNavigateToCalculadora?.();
  }, [items, onNavigateToCalculadora]);

  const handleUpdateItem = useCallback((onUpdated?: () => void) => {
    if (editingItemIndex === null) return;
    
    const item = items[editingItemIndex];
    if (!item || !calculation.isValid) return;

    const updatedItem: OrderItem = {
      ...item,
      orderedQuantity: calculation.quantity,
      unitPriceQuoted: calculation.unitPrice,
    };

    setItems((prev) => prev.map((i, idx) => idx === editingItemIndex ? updatedItem : i));
    setEditingItemIndex(null);
    setSelectedProduct(null);
    setSelectedVariant(null);
    handleClear();
    onUpdated?.();
  }, [editingItemIndex, items, calculation, handleClear]);

  const handleSubmit = useCallback(() => {
    if (!selectedCustomer || !deliveryDate || items.length === 0) return;

    const advance = parseAmount(advanceAmount);
    const calculatedPaymentStatus = advance <= 0 
      ? "sin_pago" 
      : advance >= totalAmount 
        ? "pagado_total" 
        : paymentIntent === "credito" 
          ? "adelanto_parcial" 
          : "saldo_pendiente";

    onSubmit({
      clientId: selectedCustomer.id,
      deliveryDate,
      paymentIntent,
      paymentStatus: calculatedPaymentStatus,
      advanceAmount: advance > 0 ? advance : undefined,
      balanceDue: balanceDue > 0 ? balanceDue : undefined,
      advancePaymentMethod: advance > 0 ? advancePaymentMethod || undefined : undefined,
      advanceReferenceNumber: advance > 0 && advanceReferenceNumber ? advanceReferenceNumber : undefined,
      totalAmount,
      items,
    });
  }, [
    selectedCustomer,
    deliveryDate,
    paymentIntent,
    advanceAmount,
    advancePaymentMethod,
    advanceReferenceNumber,
    balanceDue,
    totalAmount,
    items,
    onSubmit,
  ]);

  return {
    // State
    selectedCustomer,
    deliveryDate,
    paymentIntent,
    paymentStatus,
    advanceAmount,
    advancePaymentMethod,
    advanceReferenceNumber,
    items,

    // UI State
    showVariantSelector,
    showAdvancePayment,
    editingItemIndex,

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
    balanceDue,
    isValid,
    isKgProduct,
    minDeliveryDate,
    isSubmitting,

    // Actions
    setSelectedCustomer,
    setDeliveryDate,
    setPaymentIntent,
    setPaymentStatus,
    setAdvanceAmount,
    setAdvancePaymentMethod,
    setAdvanceReferenceNumber,
    setShowVariantSelector,
    setShowAdvancePayment,
    handleVariantSelect,
    startEditingItem,
    handleUpdateItem,
    handleAddItem,
    handleRemoveItem,
    handleSubmit,
  };
}

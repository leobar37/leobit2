import { useState, useMemo, useCallback } from "react";
import { useChickenCalculator } from "~/hooks/use-chicken-calculator";
import { toDateString, addDays, now } from "~/lib/date-utils";
import type { Customer, Product, ProductVariant } from "~/lib/db/schema";

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
  calculator: ReturnType<typeof useChickenCalculator>;
  
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

export function useOrderForm({ onSubmit }: UseOrderFormOptions): UseOrderFormReturn {
  // Main form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentIntent, setPaymentIntent] = useState<"contado" | "credito">("contado");
  const [items, setItems] = useState<OrderItem[]>([]);
  
  // UI state
  const [showItemForm, setShowItemForm] = useState(false);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  
  // Selected product/variant for calculator
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  
  // Calculator hook
  const calculator = useChickenCalculator({
    productPrice: selectedVariant?.price,
    productId: selectedProduct?.id,
    variantId: selectedVariant?.id,
    unitType: selectedProduct?.unit === "kg" ? "kg" : "unidad",
  });
  
  // Computed values
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + item.orderedQuantity * item.unitPriceQuoted;
    }, 0);
  }, [items]);
  
  const isValid = selectedCustomer !== null && deliveryDate !== "" && items.length > 0;
  
  const isKgProduct = selectedProduct?.unit === "kg";
  
  // Min delivery date is tomorrow - using date-utils
  const minDeliveryDate = useMemo(() => 
    toDateString(addDays(now(), 1)), 
  []);
  
  // Actions
  const handleVariantSelect = useCallback((product: Product, variant: ProductVariant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant);
    setShowVariantSelector(false);
    setShowItemForm(true);
    calculator.handleReset();
  }, [calculator]);
  
  const handleAddItem = useCallback(() => {
    if (!selectedProduct || !selectedVariant) return;

    const isKgProductLocal = selectedProduct.unit === "kg";
    
    let quantity: number;
    let unitPrice: number;
    let total: number;

    if (isKgProductLocal) {
      // Use calculator values for kg products
      quantity = calculator.kgNeto;
      unitPrice = parseFloat(calculator.values.pricePerKg) || 0;
      total = parseFloat(calculator.values.totalAmount) || 0;
    } else {
      // For unit-based products, use simple inputs or calculator
      quantity = calculator.kgNeto || 1;
      unitPrice = parseFloat(calculator.values.pricePerKg) || parseFloat(selectedVariant.price);
      total = parseFloat(calculator.values.totalAmount) || (quantity * unitPrice);
    }

    if (quantity <= 0 || unitPrice <= 0 || total <= 0) return;

    const item: OrderItem = {
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantName: selectedVariant.name,
      orderedQuantity: quantity,
      unitPriceQuoted: unitPrice,
    };

    setItems((prev) => [...prev, item]);
    setShowItemForm(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    calculator.handleReset();
  }, [selectedProduct, selectedVariant, calculator]);
  
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
  }, [selectedCustomer, deliveryDate, paymentIntent, totalAmount, items, onSubmit]);
  
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
    calculator,
    
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

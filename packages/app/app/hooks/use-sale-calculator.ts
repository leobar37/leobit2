/**
 * Hook que combina el reducer de calculadora con useSmartCalculator
 * Encapsula toda la lógica de estado de CalculatorContent
 */
import { useMemo, useEffect } from "react";
import { useCalculatorState } from "~/lib/calculator/calculator-reducer";
import { useSmartCalculator } from "~/hooks/use-smart-calculator";
import { saleItemTransformer } from "@avileo/shared";
import type { SaleItem } from "~/hooks/use-sales";
import type { Product } from "~/hooks/use-products";

interface UseSaleCalculatorOptions {
  editingItem?: SaleItem | null;
  products: Product[];
  settings?: {
    calculators?: {
      sales?: {
        hideTara?: boolean;
        autoFillPrice?: boolean;
      };
    };
  };
}

export function useSaleCalculator({
  editingItem,
  products,
  settings,
}: UseSaleCalculatorOptions) {
  const { state, actions } = useCalculatorState(
    editingItem
      ? {
          isEditMode: true,
          editingItemId: editingItem.id,
          selectedProductId: editingItem.productId,
          selectedVariantId: editingItem.variantId,
        }
      : undefined
  );

  const {
    selectedProductId,
    selectedVariantId,
    productSearch,
    productFilter,
    isEditMode,
  } = state;

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive),
    [products]
  );
  const showProductDiscovery = activeProducts.length > 8;
  const productTypeFilters = useMemo(
    () =>
      Array.from(
        new Set(activeProducts.map((product) => product.type).filter(Boolean))
      ),
    [activeProducts]
  );
  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    return activeProducts.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch);
      const matchesFilter =
        productFilter === "all" ||
        product.unit === productFilter ||
        product.type === productFilter;

      return matchesSearch && matchesFilter;
    });
  }, [activeProducts, productFilter, productSearch]);

  const calculatorSettings = settings?.calculators?.sales;
  const hideTara = calculatorSettings?.hideTara ?? true;
  const autoFillPrice = calculatorSettings?.autoFillPrice ?? true;

  // Transformar valores de edición usando el transformer
  const editingInitialValues = useMemo(() => {
    if (!isEditMode || !editingItem) return undefined;

    return saleItemTransformer.toForm(editingItem);
  }, [isEditMode, editingItem]);

  // Hook de calculadora inteligente
  const calculator = useSmartCalculator({
    product: selectedProduct,
    variant: undefined, // Se carga por separado
    autoFillPrice,
    hideTara,
    initialValues: editingInitialValues
      ? {
          quantity: editingInitialValues.quantity || "",
          unitPrice: editingInitialValues.unitPrice || "",
          subtotal: editingInitialValues.subtotal || "",
          isKgProduct: selectedProduct?.unit === "kg",
        }
      : undefined,
  });

  // Resetear calculadora cuando cambia producto/variante
  useEffect(() => {
    if (isEditMode && editingItem && selectedProduct) {
      const values = saleItemTransformer.toForm(editingItem);

      if (selectedProduct.unit === "kg") {
        calculator.form.reset({
          totalAmount: values.subtotal || "",
          pricePerKg: values.unitPrice || "",
          kilos: values.quantity || "",
          tara: "0",
          pricePerPack: "",
          packs: "",
          units: "",
        });
      } else {
        calculator.form.reset({
          totalAmount: values.subtotal || "",
          pricePerKg: "",
          kilos: "",
          tara: "0",
          pricePerPack: values.unitPrice || "",
          packs: values.quantity || "",
          units: "",
        });
      }
    }
  }, [isEditMode, editingItem, selectedProduct, calculator.form]);

  return {
    // Estado
    state,
    
    // Acciones del reducer
    ...actions,
    
    // Datos computados
    selectedProduct,
    activeProducts,
    showProductDiscovery,
    productTypeFilters,
    filteredProducts,
    
    // Calculadora
    calculator,
    
    // Config
    hideTara,
    autoFillPrice,
  };
}

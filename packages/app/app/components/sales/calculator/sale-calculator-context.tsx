import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useParams, useNavigate } from "react-router";
import { saleItemTransformer } from "@avileo/shared";
import { useSaleCalculatorUrlState } from "~/hooks/use-sale-calculator-url-state";
import { useSaleEditorState } from "~/hooks/use-sale-editor-state";
import { useSale, useSaleEditingItem } from "~/hooks/use-sales";
import {
  useAddSaleItem,
  useUpdateSaleItem,
} from "~/hooks/use-sales-db";
import { useSaleProductPicker } from "~/hooks/use-sale-product-picker";
import { useSmartCalculator } from "~/hooks/use-smart-calculator";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import { useToast } from "~/hooks/use-toast";
import { getSaleEditorPath } from "~/lib/sales/navigation";
import { formatCurrency } from "~/lib/utils";
import { buildOptimisticSaleItem } from "~/lib/sales/optimistic-cache";

export interface CalculatorFooterActions {
  primaryLabel: string;
  secondaryLabel: string;
  isPrimaryDisabled: boolean;
  onPrimaryAction: () => void | Promise<void>;
  onSecondaryAction: () => void;
}

interface SaleCalculatorContextType {
  saleId: string | null;
  urlState: ReturnType<typeof useSaleCalculatorUrlState>;
  picker: ReturnType<typeof useSaleProductPicker>;
  calculator: ReturnType<typeof useSmartCalculator>;
  editing: {
    item: NonNullable<ReturnType<typeof useSaleEditingItem>["data"]>["editingItem"] | null;
    isEditMode: boolean;
  };
  settings: {
    hideTara: boolean;
    autoFillPrice: boolean;
    hidePrices: boolean;
  };
  footerActions: CalculatorFooterActions | null;
  isSaving: boolean;
  save: () => void;
  cancel: () => void;
}

const SaleCalculatorContext = createContext<SaleCalculatorContextType | null>(
  null,
);

export function SaleCalculatorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { id: saleIdParam } = useParams<{ id: string }>();
  const saleId = saleIdParam ?? null;

  const urlState = useSaleCalculatorUrlState();
  const editorState = useSaleEditorState();

  // Unify itemId from both URL state sources
  const effectiveItemId = urlState.itemId ?? editorState.editingItemId;
  const setItemId = urlState.setItemId;

  const { data: sale } = useSale(saleId);
  const saleItems = sale?.items ?? [];

  const { data: editingData } = useSaleEditingItem(saleId, effectiveItemId);
  const editingItem = editingData?.editingItem ?? null;
  const isEditMode = editingData?.isEditMode ?? false;

  const picker = useSaleProductPicker({
    saleItems,
    selectedProductId: urlState.productId,
    selectedVariantId: urlState.variantId,
    search: urlState.search,
    filter: urlState.filter,
    onSelectProduct: urlState.setProductId,
    onSelectVariant: urlState.setVariantId,
  });

  const { toast } = useToast();
  const addItem = useAddSaleItem();
  const updateItem = useUpdateSaleItem();
  const { settings } = useBusinessSettings();

  // Sync product/variant selection when editing item loads
  useEffect(() => {
    if (isEditMode && editingItem) {
      urlState.setProductId(editingItem.productId);
      urlState.setVariantId(editingItem.variantId);
    }
  }, [isEditMode, editingItem, urlState]);

  const calculatorSettings = settings?.calculators?.sales;
  const hideTara = calculatorSettings?.hideTara ?? true;
  const autoFillPrice = calculatorSettings?.autoFillPrice ?? true;
  const hidePrices = calculatorSettings?.hidePrices ?? false;

  const editingInitialValues =
    isEditMode && editingItem
      ? {
          quantity: saleItemTransformer.toForm(editingItem).quantity || "",
          unitPrice: saleItemTransformer.toForm(editingItem).unitPrice || "",
          subtotal: saleItemTransformer.toForm(editingItem).subtotal || "",
        }
      : undefined;

  const calculator = useSmartCalculator({
    product: picker.selectedProduct ?? undefined,
    variant: picker.selectedVariant ?? undefined,
    autoFillPrice,
    hideTara,
    initialValues: editingInitialValues,
  });

  // Populate calculator values when editing and product/variant loads
  useEffect(() => {
    if (
      !isEditMode ||
      !editingItem ||
      !picker.selectedProduct ||
      !picker.selectedVariant
    )
      return;

    const formValues = saleItemTransformer.toForm(editingItem);

    if (calculator.isKgProduct) {
      calculator.form.reset({
        totalAmount: formValues.subtotal || "",
        pricePerKg: formValues.unitPrice || "",
        kilos: formValues.quantity || "",
        tara: "0",
        pricePerPack: "",
        packs: "",
        units: "",
      });
    } else {
      calculator.form.reset({
        totalAmount: formValues.subtotal || "",
        pricePerKg: "",
        kilos: "",
        tara: "0",
        pricePerPack: formValues.unitPrice || "",
        packs: formValues.quantity || "",
        units: "",
      });
    }
  }, [
    isEditMode,
    editingItem,
    picker.selectedProduct,
    picker.selectedVariant,
    calculator.isKgProduct,
    calculator.form,
  ]);

  const save = useCallback(() => {
    if (
      !picker.selectedProduct ||
      !picker.selectedVariant ||
      !calculator.calculation.isValid ||
      !saleId
    ) {
      return;
    }

    const numericCalculation = saleItemTransformer.toNumbers(
      calculator.calculation,
    );

    if (isEditMode && editingItem) {
      updateItem.mutate({
        saleId,
        itemId: editingItem.id,
        data: {
          quantity: numericCalculation.quantity ?? 0,
          unitPrice: numericCalculation.unitPrice ?? 0,
          subtotal: numericCalculation.subtotal ?? 0,
        },
      });
      setItemId(null);
      navigate(getSaleEditorPath(saleId));
      return;
    }

    const optimisticItem = buildOptimisticSaleItem({
      productId: picker.selectedProduct.id,
      variantId: picker.selectedVariant.id,
      productName: picker.selectedProduct.name,
      variantName: picker.selectedVariant.name,
      quantity: numericCalculation.quantity ?? 0,
      unitPrice: numericCalculation.unitPrice ?? 0,
      subtotal: numericCalculation.subtotal ?? 0,
    });

    addItem.mutate({
      saleId,
      item: {
        productId: picker.selectedProduct.id,
        variantId: picker.selectedVariant.id,
        quantity: numericCalculation.quantity ?? 0,
        price: numericCalculation.unitPrice ?? 0,
        subtotal: numericCalculation.subtotal ?? 0,
      },
      optimisticItem,
    });

    navigate(getSaleEditorPath(saleId));
  }, [
    addItem,
    calculator.calculation,
    editingItem,
    isEditMode,
    navigate,
    saleId,
    picker.selectedProduct,
    picker.selectedVariant,
    setItemId,
    updateItem,
  ]);

  const cancel = useCallback(() => {
    setItemId(null);
    navigate(getSaleEditorPath(saleId!));
  }, [navigate, saleId, setItemId]);

  const isSaving = addItem.isPending || updateItem.isPending;

  const footerActions = useMemo<CalculatorFooterActions | null>(() => {
    if (!picker.selectedVariant) {
      return null;
    }

    return {
      primaryLabel: isEditMode
        ? `Actualizar · S/ ${formatCurrency(calculator.calculation.subtotal)}`
        : `Agregar al carrito · S/ ${formatCurrency(calculator.calculation.subtotal)}`,
      secondaryLabel: "Cancelar",
      isPrimaryDisabled: !calculator.isValid || isSaving,
      onPrimaryAction: save,
      onSecondaryAction: cancel,
    };
  }, [
    calculator.calculation.subtotal,
    calculator.isValid,
    cancel,
    isEditMode,
    isSaving,
    picker.selectedVariant,
    save,
  ]);

  const value = useMemo(
    () => ({
      saleId,
      urlState,
      picker,
      calculator,
      editing: {
        item: editingItem,
        isEditMode,
      },
      settings: {
        hideTara,
        autoFillPrice,
        hidePrices,
      },
      footerActions,
      isSaving,
      save,
      cancel,
    }),
    [
      saleId,
      urlState,
      picker,
      calculator,
      editingItem,
      isEditMode,
      hideTara,
      autoFillPrice,
      hidePrices,
      footerActions,
      isSaving,
      save,
      cancel,
    ],
  );

  return (
    <SaleCalculatorContext.Provider value={value}>
      {children}
    </SaleCalculatorContext.Provider>
  );
}

export function useSaleCalculator() {
  const context = useContext(SaleCalculatorContext);

  if (!context) {
    throw new Error(
      "useSaleCalculator must be used within SaleCalculatorProvider",
    );
  }

  return context;
}

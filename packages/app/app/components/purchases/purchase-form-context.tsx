import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useBusiness } from "~/hooks/use-business";
import { useSuppliers, type Supplier } from "~/hooks/use-suppliers";
import { useCreatePurchase } from "~/hooks/use-purchases";
import { useUploadFile } from "~/hooks/use-files";
import { generateId } from "~/lib/utils";
import type { CreatePurchaseInput } from "~/lib/db/schema";

interface PurchaseItem {
  id: string;
  productId: string;
  variantId: string | null;
  unitId?: string;
  productName: string;
  variantName: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
}

interface PurchaseFormValues {
  purchaseDate: string;
  invoiceNumber: string;
  notes: string;
}

interface PurchaseFormContextType {
  supplier: Supplier | null;
  setSupplier: (supplier: Supplier | null) => void;
  items: PurchaseItem[];
  addItem: (item: Omit<PurchaseItem, "id">) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<Omit<PurchaseItem, "id">>) => void;
  clearItems: () => void;
  receiptFile: File | null;
  receiptPreview: string | null;
  handleReceiptSelect: (file: File) => void;
  handleReceiptClear: () => void;
  fileUploadStatus: {
    isUploading: boolean;
    isPending: boolean;
    isError: boolean;
  };
  purchaseError: string | null;
  clearPurchaseError: () => void;
  form: ReturnType<typeof useForm<PurchaseFormValues>>;
  totalAmount: number;
  cartItemsCount: number;
  isFormValid: boolean;
  onSubmit: () => Promise<void>;
  isPending: boolean;
}

const PurchaseFormContext = createContext<PurchaseFormContextType | null>(null);

export function usePurchaseForm() {
  const context = useContext(PurchaseFormContext);
  if (!context) {
    throw new Error("usePurchaseForm must be used within PurchaseFormProvider");
  }
  return context;
}

interface PurchaseFormProviderProps {
  children: React.ReactNode;
}

export function PurchaseFormProvider({ children }: PurchaseFormProviderProps) {
  const navigate = useNavigate();
  const { data: business } = useBusiness();
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [fileUploadStatus, setFileUploadStatus] = useState({
    isUploading: false,
    isPending: false,
    isError: false,
  });
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const form = useForm<PurchaseFormValues>({
    defaultValues: {
      purchaseDate: new Date().toISOString().split("T")[0],
      invoiceNumber: "",
      notes: "",
    },
  });

  const addItem = useCallback((item: Omit<PurchaseItem, "id">) => {
    const newItem: PurchaseItem = {
      ...item,
      id: generateId(),
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Omit<PurchaseItem, "id">>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.unitCost !== undefined) {
          const qty = parseFloat(updated.quantity) || 0;
          const cost = parseFloat(updated.unitCost) || 0;
          updated.totalCost = (qty * cost).toString();
        }
        return updated;
      })
    );
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  const handleReceiptSelect = useCallback((file: File) => {
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setFileUploadStatus({
      isUploading: false,
      isPending: true,
      isError: false,
    });
  }, []);

  const handleReceiptClear = useCallback(() => {
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }
    setReceiptFile(null);
    setReceiptPreview(null);
    setFileUploadStatus({
      isUploading: false,
      isPending: false,
      isError: false,
    });
  }, [receiptPreview]);

  const clearPurchaseError = useCallback(() => {
    setPurchaseError(null);
  }, []);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.totalCost) || 0);
    }, 0);
  }, [items]);

  const cartItemsCount = items.length;

  const isFormValid = useMemo(() => {
    return items.length > 0 && business !== undefined && supplier !== null;
  }, [items.length, business, supplier]);

  const createPurchaseMutation = useCreatePurchase();
  const uploadReceiptFile = useUploadFile({
    entityType: "order",
    fieldName: "receiptImageId",
  });

  const createPurchase = useMutation({
    mutationFn: async () => {
      const purchaseDate = form.getValues("purchaseDate");
      const supplierId = supplier?.id || "";

      let receiptImageId: string | undefined;
      if (receiptFile) {
        try {
          const result = await uploadReceiptFile.mutateAsync(receiptFile);
          receiptImageId = (result as { isOffline?: boolean }).isOffline
            ? undefined
            : (result as { id: string }).id;

          if (!(result as { isOffline?: boolean }).isOffline) {
            setFileUploadStatus((prev) => ({ ...prev, isPending: true }));
          }
        } catch (error) {
          console.error("Error uploading file:", error);
          setFileUploadStatus((prev) => ({ ...prev, isError: true }));
          throw error;
        }
      }

      const total = items.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);

      const result = await createPurchaseMutation.mutateAsync({
        supplierId: supplier?.id || "",
        purchaseDate: purchaseDate,
        totalAmount: total,
        invoiceNumber: form.getValues("invoiceNumber") || undefined,
        receiptImageId: receiptImageId,
        notes: form.getValues("notes") || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          unitId: item.unitId || undefined,
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost),
        })),
      });

      return result.id;
    },
    onSuccess: () => {
      navigate("/compras");
    },
    onError: (error) => {
      console.error("[CREATE PURCHASE MUTATION] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al guardar la compra";
      setPurchaseError(errorMessage);
    },
  });

  const onSubmit = useCallback(async () => {
    try {
      await createPurchase.mutateAsync();
    } catch (error) {
      console.error("[PURCHASE FORM] mutation error:", error);
      throw error;
    }
  }, [createPurchase]);

  const value: PurchaseFormContextType = {
    supplier,
    setSupplier,
    items,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    receiptFile,
    receiptPreview,
    handleReceiptSelect,
    handleReceiptClear,
    fileUploadStatus,
    purchaseError,
    clearPurchaseError,
    form,
    totalAmount,
    cartItemsCount,
    isFormValid,
    onSubmit,
    isPending: createPurchase.isPending,
  };

  return (
    <PurchaseFormContext.Provider value={value}>
      <FormProvider {...form}>{children}</FormProvider>
    </PurchaseFormContext.Provider>
  );
}

/**
 * Purchase Form Context - Simplified
 * Single flow for both new purchases (draft) and editing existing purchases
 */

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "~/hooks/use-business";
import { useSuppliers, type Supplier } from "~/hooks/use-suppliers";
import { useUploadFile } from "~/hooks/use-files";
import { usePurchaseService } from "~/lib/sync/engine-provider";
import type { PurchaseWithItems } from "~/lib/services/purchase-service";

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
  purchaseId: string | null;
  purchase: PurchaseWithItems | null;
  supplier: Supplier | null;
  setSupplier: (supplier: Supplier | null) => void;
  items: PurchaseItem[];
  addItem: (item: Omit<PurchaseItem, "id">) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<Omit<PurchaseItem, "id">>) => Promise<void>;
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
  canEdit: boolean;
  onSave: () => Promise<void>;
  isPending: boolean;
  isLoading: boolean;
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
  const queryClient = useQueryClient();
  const { draftId } = useParams<{ draftId: string }>();
  const purchaseId = draftId || null;
  
  const { data: business } = useBusiness();
  const { data: suppliers } = useSuppliers(business?.id || "");
  const purchaseService = usePurchaseService();

  // Load purchase if editing, or null if creating new
  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ["purchase-form", purchaseId],
    queryFn: async () => {
      if (!purchaseId) return null;
      return purchaseService.findById(purchaseId);
    },
    enabled: !!purchaseId,
  });

  const purchase = purchaseData || null;
  const isDraft = purchase?.status === "draft";
  const canEdit = !purchase || isDraft || purchase.status === "pending";

  // Form state
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
      purchaseDate: purchase?.purchaseDate || new Date().toISOString().split("T")[0],
      invoiceNumber: purchase?.invoiceNumber || "",
      notes: purchase?.notes || "",
    },
    values: {
      purchaseDate: purchase?.purchaseDate || new Date().toISOString().split("T")[0],
      invoiceNumber: purchase?.invoiceNumber || "",
      notes: purchase?.notes || "",
    },
  });

  // Items from purchase or empty
  const items = useMemo(() => {
    if (!purchase?.items) return [];
    return purchase.items.map(item => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      unitId: undefined as string | undefined,
      productName: item.productName,
      variantName: item.variantName,
      quantity: String(item.quantity),
      unitCost: String(item.unitCost),
      totalCost: String(item.totalCost),
    }));
  }, [purchase?.items]);

  const supplier = useMemo(() => {
    if (!purchase?.supplierId || !suppliers) return null;
    return suppliers.find(s => s.id === purchase.supplierId) || null;
  }, [purchase?.supplierId, suppliers]);

  const setSupplier = useCallback(async (newSupplier: Supplier | null) => {
    if (!purchase) return;
    try {
      await purchaseService.update(purchase.id, { supplierId: newSupplier?.id });
      queryClient.invalidateQueries({ queryKey: ["purchase-form", purchase.id] });
    } catch (error) {
      console.error("Error updating supplier:", error);
    }
  }, [purchase, purchaseService, queryClient]);

  const addItem = useCallback(async (item: Omit<PurchaseItem, "id">) => {
    if (!purchase) {
      // Create new purchase (draft) first
      const newPurchase = await purchaseService.create({
        supplierId: supplier?.id,
        purchaseDate: form.getValues("purchaseDate"),
        invoiceNumber: form.getValues("invoiceNumber"),
        notes: form.getValues("notes"),
      });
      // Add item to new purchase
      await purchaseService.addItemToPurchase(newPurchase.id, {
        productId: item.productId,
        variantId: item.variantId || undefined,
        unitId: item.unitId,
        quantity: parseFloat(item.quantity),
        unitCost: parseFloat(item.unitCost),
      });
      // Navigate to nueva URL with draftId
      navigate(`/compras/nueva/${newPurchase.id}`, { replace: true });
    } else {
      // Add to existing purchase
      await purchaseService.addItemToPurchase(purchase.id, {
        productId: item.productId,
        variantId: item.variantId || undefined,
        unitId: item.unitId,
        quantity: parseFloat(item.quantity),
        unitCost: parseFloat(item.unitCost),
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-form", purchase.id] });
    }
  }, [purchase, purchaseService, supplier, form, navigate, queryClient]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!purchase) return;
    await purchaseService.deleteItemFromPurchase(purchase.id, itemId);
    queryClient.invalidateQueries({ queryKey: ["purchase-form", purchase.id] });
  }, [purchase, purchaseService, queryClient]);

  const updateItem = useCallback(async (itemId: string, updates: Partial<Omit<PurchaseItem, "id">>) => {
    if (!purchase) return;
    const quantity = updates.quantity !== undefined ? parseFloat(updates.quantity) : undefined;
    const unitCost = updates.unitCost !== undefined ? parseFloat(updates.unitCost) : undefined;
    await purchaseService.updateItemInPurchase(purchase.id, itemId, { quantity, unitCost });
    queryClient.invalidateQueries({ queryKey: ["purchase-form", purchase.id] });
  }, [purchase, purchaseService, queryClient]);

  const handleReceiptSelect = useCallback((file: File) => {
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setFileUploadStatus({ isUploading: false, isPending: true, isError: false });
  }, []);

  const handleReceiptClear = useCallback(() => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview(null);
    setFileUploadStatus({ isUploading: false, isPending: false, isError: false });
  }, [receiptPreview]);

  const clearPurchaseError = useCallback(() => setPurchaseError(null), []);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0);
  }, [items]);

  const isFormValid = items.length > 0 && supplier !== null && !!form.getValues("purchaseDate");

  const uploadReceiptFile = useUploadFile({ entityType: "order", fieldName: "receiptImageId" });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!purchase) throw new Error("No purchase");

      // Upload receipt if provided
      let receiptImageId: string | undefined;
      if (receiptFile) {
        const result = await uploadReceiptFile.mutateAsync(receiptFile);
        receiptImageId = (result as { isOffline?: boolean }).isOffline ? undefined : (result as { id: string }).id;
        if (receiptImageId) {
          await purchaseService.update(purchase.id, { receiptImageId });
        }
      }

      // Update purchase fields (normalize empty strings to undefined)
      await purchaseService.update(purchase.id, {
        purchaseDate: form.getValues("purchaseDate"),
        invoiceNumber: form.getValues("invoiceNumber") || undefined,
        notes: form.getValues("notes") || undefined,
      });

      // If draft, confirm it (change status to pending)
      if (purchase.status === "draft") {
        await purchaseService.updateStatus(purchase.id, "pending");
      }

      return purchase.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases-new"] });
      navigate("/compras");
    },
    onError: (error) => {
      setPurchaseError(error instanceof Error ? error.message : "Error al guardar");
    },
  });

  const onSave = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);

  const value: PurchaseFormContextType = {
    purchaseId,
    purchase,
    supplier,
    setSupplier,
    items,
    addItem,
    removeItem,
    updateItem,
    receiptFile,
    receiptPreview,
    handleReceiptSelect,
    handleReceiptClear,
    fileUploadStatus,
    purchaseError,
    clearPurchaseError,
    form,
    totalAmount,
    cartItemsCount: items.length,
    isFormValid,
    canEdit,
    onSave,
    isPending: saveMutation.isPending,
    isLoading,
  };

  return (
    <PurchaseFormContext.Provider value={value}>
      <FormProvider {...form}>{children}</FormProvider>
    </PurchaseFormContext.Provider>
  );
}

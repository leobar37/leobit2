/**
 * Purchase Form Context - API-based (Eden Treaty)
 * Single flow for both new purchases and editing existing purchases
 */

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useForm, FormProvider, type UseFormReturn } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "~/hooks/use-business";
import { useSuppliers, type Supplier } from "~/hooks/use-suppliers";
import { useUploadFile } from "~/hooks/use-files";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";

/** Purchase status from API */
type PurchaseStatus = "pending" | "received" | "cancelled";

/** Purchase item as returned by API */
interface ApiPurchaseItem {
  id: string;
  businessId: string;
  purchaseId: string;
  productId: string;
  variantId: string | null;
  unitId: string | null;
  quantity: string;
  unitCost: string;
  totalCost: string;
  createdAt: Date;
  updatedAt: Date;
  productName?: string;
  variantName?: string;
}

/** Purchase with items from API */
interface PurchaseWithItems {
  id: string;
  businessId: string;
  supplierId: string | null;
  purchaseDate: string | null;
  totalAmount: string;
  status: PurchaseStatus;
  invoiceNumber: string | null;
  receiptImageId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: ApiPurchaseItem[];
}

/** Local purchase item for form state */
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

/** Input for creating a purchase item via API */
interface CreatePurchaseItemInput {
  productId: string;
  variantId?: string;
  unitId?: string;
  quantity: number;
  unitCost: number;
}

/** Input for creating a purchase via API */
interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber?: string;
  receiptImageId?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
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
  form: UseFormReturn<PurchaseFormValues>;
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
  const { data: suppliers } = useSuppliers();

  // Load purchase if editing, or null if creating new
  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ["purchase-form", purchaseId],
    queryFn: async () => {
      if (!purchaseId) return null;
      const response = await api.purchases({ id: purchaseId }).get();
      return extractData<PurchaseWithItems>(response);
    },
    enabled: !!purchaseId,
  });

  const purchase = purchaseData || null;
  const canEdit = !purchase || purchase.status === "pending";

  // Form state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [fileUploadStatus, setFileUploadStatus] = useState({
    isUploading: false,
    isPending: false,
    isError: false,
  });
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Local state for new purchases (API does not support drafts or incremental item ops)
  const [localItems, setLocalItems] = useState<PurchaseItem[]>([]);
  const [localSupplier, setLocalSupplier] = useState<Supplier | null>(null);

  const form = useForm<PurchaseFormValues>({
    defaultValues: {
      purchaseDate: purchase?.purchaseDate
        ? purchase.purchaseDate
        : new Date().toISOString().split("T")[0],
      invoiceNumber: purchase?.invoiceNumber || "",
      notes: purchase?.notes || "",
    },
    values: {
      purchaseDate: purchase?.purchaseDate
        ? purchase.purchaseDate
        : new Date().toISOString().split("T")[0],
      invoiceNumber: purchase?.invoiceNumber || "",
      notes: purchase?.notes || "",
    },
  });

  // Items from purchase (existing) or local state (new)
  const items = useMemo(() => {
    if (purchase?.items) {
      return purchase.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        unitId: item.unitId ?? undefined,
        productName: item.productName || "Producto",
        variantName: item.variantName || "",
        quantity: String(item.quantity),
        unitCost: String(item.unitCost),
        totalCost: String(item.totalCost),
      }));
    }
    return localItems;
  }, [purchase?.items, localItems]);

  const supplier = useMemo(() => {
    if (!purchase?.supplierId || !suppliers) return null;
    return suppliers.find((s) => s.id === purchase.supplierId) || null;
  }, [purchase?.supplierId, suppliers]);

  const effectiveSupplier = localSupplier || supplier;

  const setSupplier = useCallback(
    async (newSupplier: Supplier | null) => {
      if (purchase) {
        // API does not support PATCH /purchases/:id
        console.warn(
          "Updating supplier on existing purchase is not supported by the API"
        );
      }
      setLocalSupplier(newSupplier);
    },
    [purchase]
  );

  const addItem = useCallback(
    async (item: Omit<PurchaseItem, "id">) => {
      if (purchase) {
        // API does not support POST /purchases/:id/items
        throw new Error(
          "Adding items to existing purchases is not supported by the API"
        );
      }
      setLocalItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
    },
    [purchase]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (purchase) {
        // API does not support DELETE /purchases/:id/items/:itemId
        throw new Error(
          "Removing items from existing purchases is not supported by the API"
        );
      }
      setLocalItems((prev) => prev.filter((item) => item.id !== itemId));
    },
    [purchase]
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      updates: Partial<Omit<PurchaseItem, "id">>
    ) => {
      if (purchase) {
        // API does not support PATCH /purchases/:id/items/:itemId
        throw new Error(
          "Updating items in existing purchases is not supported by the API"
        );
      }
      setLocalItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    },
    [purchase]
  );

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

  const isFormValid =
    items.length > 0 && effectiveSupplier !== null && !!form.getValues("purchaseDate");

  const uploadReceiptFile = useUploadFile({
    entityType: "order",
    fieldName: "receiptImageId",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (purchase) {
        // Existing purchase: API only supports status updates.
        // Field/item edits are not supported.
        if (receiptFile) {
          // Upload receipt but note API cannot attach it to existing purchase
          await uploadReceiptFile.mutateAsync(receiptFile);
        }
        return purchase.id;
      }

      // New purchase: submit everything via POST /purchases
      if (!effectiveSupplier) {
        throw new Error("Se requiere un proveedor");
      }
      if (localItems.length === 0) {
        throw new Error("La compra debe tener al menos un item");
      }

      // Upload receipt if provided
      let receiptImageId: string | undefined;
      if (receiptFile) {
        const result = await uploadReceiptFile.mutateAsync(receiptFile);
        receiptImageId = (result as { isOffline?: boolean }).isOffline
          ? undefined
          : (result as { id: string }).id;
      }

      const input: CreatePurchaseInput = {
        supplierId: effectiveSupplier.id,
        purchaseDate: form.getValues("purchaseDate"),
        invoiceNumber: form.getValues("invoiceNumber") || undefined,
        notes: form.getValues("notes") || undefined,
        receiptImageId,
        items: localItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          unitId: item.unitId,
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost),
        })),
      };

      const response = await api.purchases.post(input);
      const result = extractData<PurchaseWithItems>(response);
      return result.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["purchases-new"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-form", id] });
      navigate("/compras");
    },
    onError: (error) => {
      setPurchaseError(
        error instanceof Error ? error.message : "Error al guardar"
      );
    },
  });

  const onSave = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);

  const value: PurchaseFormContextType = {
    purchaseId,
    purchase,
    supplier: effectiveSupplier,
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

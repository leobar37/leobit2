/**
 * Purchase Form Context - API-based (Eden Treaty)
 * Single flow for both new purchases and editing existing purchases
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSuppliers, type Supplier } from "~/hooks/use-suppliers";
import { api } from "~/lib/api-client";
import { extractData } from "~/lib/api-utils";
import { purchaseItemTransformer } from "@avileo/shared";
import { useWrapperForm } from "~/hooks/use-wrapper-form";
import { fileField } from "~/lib/forms/media-field-resolvers";
import { usePurchaseItems } from "~/hooks/use-purchase-items";
import { usePurchaseReceipt } from "~/hooks/use-purchase-receipt";

/** Purchase status from API */
type PurchaseStatus = "draft" | "pending" | "received" | "cancelled";

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
  product?: { name?: string | null } | null;
  variant?: { name?: string | null } | null;
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
  receiptImageId?: string | File | null;
}

interface PurchaseFormContextType {
  purchaseId: string | null;
  purchase: PurchaseWithItems | null;
  supplier: Supplier | null;
  setSupplier: (supplier: Supplier | null) => void;
  items: PurchaseItem[];
  addItem: (item: Omit<PurchaseItem, "id">) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<Omit<PurchaseItem, "id">>) => void;
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
  const { id, draftId } = useParams<{ id: string; draftId: string }>();
  const purchaseId = id || draftId || null;

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
  const canEdit = !purchase || purchase.status === "pending" || purchase.status === "draft";

  // Extracted hooks
  const {
    items,
    setItems,
    addItem,
    removeItem,
    updateItem,
    totalAmount,
    cartItemsCount,
  } = usePurchaseItems();

  const {
    receiptFile,
    receiptPreview,
    fileUploadStatus,
    handleReceiptSelect: handleReceiptSelectBase,
    handleReceiptClear: handleReceiptClearBase,
  } = usePurchaseReceipt();

  const [localSupplier, setLocalSupplier] = useState<Supplier | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const form = useWrapperForm<PurchaseFormValues>({
    defaultValues: {
      purchaseDate: purchase?.purchaseDate
        ? purchase.purchaseDate
        : new Date().toISOString().split("T")[0],
      invoiceNumber: purchase?.invoiceNumber || "",
      notes: purchase?.notes || "",
      receiptImageId: purchase?.receiptImageId ?? undefined,
    },
    values: {
      purchaseDate: purchase?.purchaseDate
        ? purchase.purchaseDate
        : new Date().toISOString().split("T")[0],
      invoiceNumber: purchase?.invoiceNumber || "",
      notes: purchase?.notes || "",
      receiptImageId: purchase?.receiptImageId ?? undefined,
    },
    fields: {
      receiptImageId: fileField(),
    },
  });

  const supplier = useMemo(() => {
    if (!purchase?.supplierId || !suppliers) return null;
    return suppliers.find((s) => s.id === purchase.supplierId) || null;
  }, [purchase?.supplierId, suppliers]);

  // FIX: Added purchase?.items to dependency array
  useEffect(() => {
    if (!purchase) return;

    setItems(
      purchase.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        unitId: item.unitId ?? undefined,
        productName: item.productName || item.product?.name || "Producto",
        variantName: item.variantName || item.variant?.name || "",
        ...(purchaseItemTransformer.toForm(item) as Pick<PurchaseItem, "quantity" | "unitCost" | "totalCost">),
      }))
    );
  }, [purchase?.id, purchase?.items, setItems]);

  useEffect(() => {
    if (!supplier) return;
    setLocalSupplier(supplier);
  }, [supplier?.id]);

  const effectiveSupplier = localSupplier || supplier;

  const setSupplier = useCallback(
    async (newSupplier: Supplier | null) => {
      if (purchase && purchase.status !== "draft") {
        console.warn(
          "Updating supplier on existing purchase is not supported by the API"
        );
      }
      setLocalSupplier(newSupplier);
    },
    [purchase]
  );

  const handleReceiptSelect = useCallback((file: File) => {
    handleReceiptSelectBase(file, (value) => form.setValue("receiptImageId", value));
  }, [handleReceiptSelectBase, form]);

  const handleReceiptClear = useCallback(() => {
    handleReceiptClearBase(() => form.setValue("receiptImageId", undefined));
  }, [handleReceiptClearBase, form]);

  const clearPurchaseError = useCallback(() => setPurchaseError(null), []);

  const purchaseDate = form.watch("purchaseDate");
  const isFormValid = items.length > 0 && effectiveSupplier !== null && !!purchaseDate;

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Upload receipt if provided
      let resolvedReceiptImageId: string | undefined;
      if (receiptFile) {
        const resolved = await form.resolveField("receiptImageId", receiptFile as unknown as string);
        resolvedReceiptImageId = typeof resolved === "string" ? resolved : undefined;
      }

      if (purchase?.status === "draft") {
        if (!effectiveSupplier) {
          throw new Error("Se requiere un proveedor");
        }
        if (items.length === 0) {
          throw new Error("La compra debe tener al menos un item");
        }

        const input: CreatePurchaseInput = {
          supplierId: effectiveSupplier.id,
          purchaseDate: form.getValues("purchaseDate"),
          invoiceNumber: form.getValues("invoiceNumber") || undefined,
          notes: form.getValues("notes") || undefined,
          receiptImageId: resolvedReceiptImageId,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            unitId: item.unitId,
            quantity: parseFloat(item.quantity),
            unitCost: parseFloat(item.unitCost),
          })),
        };

        const deleteResponse = await api.purchases({ id: purchase.id }).delete();
        if (deleteResponse.error) {
          throw new Error("No se pudo reemplazar el borrador de compra");
        }

        const response = await api.purchases.post({ ...input, status: "pending" });
        const result = extractData<PurchaseWithItems>(response);
        return result.id;
      }

      if (purchase) {
        if (!effectiveSupplier) {
          throw new Error("Se requiere un proveedor");
        }
        if (items.length === 0) {
          throw new Error("La compra debe tener al menos un item");
        }

        const input: CreatePurchaseInput = {
          supplierId: effectiveSupplier.id,
          purchaseDate: form.getValues("purchaseDate"),
          invoiceNumber: form.getValues("invoiceNumber") || undefined,
          notes: form.getValues("notes") || undefined,
          receiptImageId: resolvedReceiptImageId || purchase.receiptImageId || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            unitId: item.unitId,
            quantity: parseFloat(item.quantity),
            unitCost: parseFloat(item.unitCost),
          })),
        };

        const response = await api.purchases({ id: purchase.id }).put(input);
        const result = extractData<PurchaseWithItems>(response);
        return result.id;
      }

      // New purchase: submit everything via POST /purchases
      if (!effectiveSupplier) {
        throw new Error("Se requiere un proveedor");
      }
      if (items.length === 0) {
        throw new Error("La compra debe tener al menos un item");
      }

      const input: CreatePurchaseInput = {
        supplierId: effectiveSupplier.id,
        purchaseDate: form.getValues("purchaseDate"),
        invoiceNumber: form.getValues("invoiceNumber") || undefined,
        notes: form.getValues("notes") || undefined,
        receiptImageId: resolvedReceiptImageId,
        items: items.map((item) => ({
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
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-form", id] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
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
    cartItemsCount,
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

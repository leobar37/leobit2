import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useBusiness } from "~/hooks/use-business";
import { useSuppliers, type Supplier } from "~/hooks/use-suppliers";
import { purchaseCollection } from "~/lib/db/collections/purchase.collection";
import { generateId } from "~/lib/utils";
import type { CreatePurchaseInput } from "~/lib/db/schema";

interface PurchaseItem {
  id: string;
  productId: string;
  variantId: string | null;
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

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.totalCost) || 0);
    }, 0);
  }, [items]);

  const cartItemsCount = items.length;

  const isFormValid = useMemo(() => {
    return items.length > 0 && business !== undefined;
  }, [items.length, business]);

  const createPurchase = useMutation({
    mutationFn: async () => {
      const purchaseDate = form.getValues("purchaseDate");
      
      let receiptImageId: string | undefined;
      if (receiptFile) {
        setFileUploadStatus((prev) => ({ ...prev, isUploading: true }));
        try {
          const formData = new FormData();
          formData.append("file", receiptFile);
          
          const response = await fetch("/api/files/upload", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error("Failed to upload file");
          }
          
          const data = await response.json();
          receiptImageId = data.id;
        } catch (error) {
          console.error("Error uploading file:", error);
          setFileUploadStatus((prev) => ({ ...prev, isUploading: false, isError: true }));
          throw error;
        }
      }

      const input: CreatePurchaseInput = {
        supplierId: supplier?.id || "",
        purchaseDate,
        invoiceNumber: form.getValues("invoiceNumber") || undefined,
        receiptImageId,
        notes: form.getValues("notes") || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost),
        })),
      };

      const id = generateId();
      const total = items.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);

      await purchaseCollection.insert({
        id,
        supplierId: input.supplierId,
        purchaseDate: input.purchaseDate!,
        invoiceNumber: input.invoiceNumber || null,
        receiptImageId: input.receiptImageId || null,
        notes: input.notes || null,
        totalAmount: total.toString(),
        status: "pending",
        items: items.map((item) => ({
          id: generateId(),
          purchaseId: id,
          productId: item.productId,
          variantId: item.variantId,
          unitId: null,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          syncStatus: "pending",
          syncAttempts: 0,
          createdAt: new Date(),
        })),
        businessId: business?.id || "",
        syncStatus: "pending",
        syncAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return id;
    },
    onSuccess: () => {
      navigate("/compras");
    },
    onError: () => {
      setFileUploadStatus((prev) => ({ ...prev, isUploading: false, isError: true }));
    },
  });

  const onSubmit = useCallback(async () => {
    await createPurchase.mutateAsync();
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
    form,
    totalAmount,
    cartItemsCount,
    isFormValid,
    onSubmit,
    isPending: createPurchase.isPending,
  };

  return (
    <PurchaseFormContext.Provider value={value}>
      {children}
    </PurchaseFormContext.Provider>
  );
}

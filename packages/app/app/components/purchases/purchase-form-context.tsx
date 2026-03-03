"use client";

import React, { createContext, useContext, useMemo, useCallback, useState } from "react";
import { useForm, FormProvider, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { useCreatePurchase } from "~/hooks/use-purchases";
import { useFileUpload } from "~/hooks/use-file-upload";
import { getToday } from "~/lib/date-utils";
import { usePurchaseStore, type PurchaseCartItem } from "~/stores/purchase.store";
import type { Supplier } from "~/hooks/use-suppliers";

// ============================================================================
// SCHEMAS
// ============================================================================

const purchaseFormSchema = z.object({
  purchaseDate: z.string().min(1, "La fecha es requerida"),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

export interface PurchaseFormContextValue {
  // Form
  form: UseFormReturn<PurchaseFormData>;

  // Supplier
  supplier: Supplier | null;
  setSupplier: (supplier: Supplier | null) => void;

  // Receipt Image
  receiptFile: File | null;
  receiptPreview: string | null;
  handleReceiptSelect: (file: File) => void;
  handleReceiptClear: () => void;
  fileUploadStatus: ReturnType<typeof useFileUpload>;

  // Cart Items (from Zustand store)
  cartItems: PurchaseCartItem[];
  addToCart: (item: PurchaseCartItem) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;

  // Submit
  onSubmit: () => void;
  isPending: boolean;

  // Computed
  totalAmount: number;
  cartItemsCount: number;
  isFormValid: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const PurchaseFormContext = createContext<PurchaseFormContextValue | null>(null);

export function usePurchaseForm() {
  const context = useContext(PurchaseFormContext);
  if (!context) {
    throw new Error("usePurchaseForm must be used within PurchaseFormProvider");
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface PurchaseFormProviderProps {
  children: React.ReactNode;
  initialSupplier?: Supplier | null;
  onSuccess?: () => void;
}

export function PurchaseFormProvider({
  children,
  initialSupplier = null,
  onSuccess,
}: PurchaseFormProviderProps) {
  const navigate = useNavigate();
  const { mutate: createPurchase, isPending } = useCreatePurchase();
  const fileUpload = useFileUpload();

  // Zustand store for cart items
  const cartItems = usePurchaseStore((state) => state.cartItems);
  const addToCart = usePurchaseStore((state) => state.addToCart);
  const removeFromCart = usePurchaseStore((state) => state.removeFromCart);
  const clearCart = usePurchaseStore((state) => state.clearCart);

  const [supplier, setSupplier] = useState<Supplier | null>(initialSupplier);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    mode: "onBlur",
    defaultValues: {
      purchaseDate: getToday(),
      invoiceNumber: "",
      notes: "",
    },
  });

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartItems]);

  const cartItemsCount = cartItems.length;
  const isFormValid = supplier !== null && cartItemsCount > 0;

  const handleReceiptSelect = useCallback((file: File) => {
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }, []);

  const handleReceiptClear = useCallback(() => {
    if (receiptPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(receiptPreview);
    }
    setReceiptFile(null);
    setReceiptPreview(null);
  }, [receiptPreview]);

  const handleSubmit = useCallback(form.handleSubmit(async (data) => {
    if (!supplier) {
      form.setError("root", {
        message: "Debes seleccionar un proveedor"
      });
      return;
    }

    if (cartItems.length === 0) {
      form.setError("root", {
        message: "Agrega al menos un producto"
      });
      return;
    }

    let receiptImageId: string | undefined;

    if (receiptFile) {
      try {
        const result = await fileUpload.upload(receiptFile);
        receiptImageId = result.id;
      } catch {
        form.setError("root", {
          message: "Error al subir la imagen del comprobante"
        });
        return;
      }
    }

    // Transform cart items to purchase items
    const items = cartItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      unitId: item.unitId,
      packs: item.packs,
      quantity: item.quantity,
      unitCost: item.unitCost,
    }));

    createPurchase(
      {
        purchaseDate: data.purchaseDate,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes,
        supplierId: supplier.id,
        receiptImageId,
        items,
      },
      {
        onSuccess: () => {
          clearCart();
          onSuccess?.();
          navigate("/compras");
        },
        onError: (error) => {
          form.setError("root", {
            message: error instanceof Error ? error.message : "Error al guardar la compra"
          });
        },
      }
    );
  }), [supplier, createPurchase, form, onSuccess, navigate, receiptFile, fileUpload, cartItems, clearCart]);

  const value = useMemo(() => ({
    form,
    supplier,
    setSupplier,
    receiptFile,
    receiptPreview,
    handleReceiptSelect,
    handleReceiptClear,
    fileUploadStatus: fileUpload,
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    onSubmit: handleSubmit,
    isPending,
    isFormValid,
    totalAmount,
    cartItemsCount,
  }), [
    form, supplier, setSupplier,
    receiptFile, receiptPreview, handleReceiptSelect, handleReceiptClear, fileUpload,
    cartItems, addToCart, removeFromCart, clearCart,
    handleSubmit, isPending, isFormValid, totalAmount, cartItemsCount
  ]);

  return (
    <PurchaseFormContext.Provider value={value}>
      <FormProvider {...form}>
        {children}
      </FormProvider>
    </PurchaseFormContext.Provider>
  );
}

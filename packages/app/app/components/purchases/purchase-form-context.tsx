"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useForm, FormProvider, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { useCreatePurchase } from "~/hooks/use-purchases";
import { useProducts } from "~/hooks/use-products";
import { getToday } from "~/lib/date-utils";
import type { Supplier } from "~/hooks/use-suppliers";

// ============================================================================
// SCHEMAS
// ============================================================================

const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto"),
  variantId: z.string().optional(),
  unitId: z.string().optional(),
  packs: z.number().optional(),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  unitCost: z.number().min(0, "El costo no puede ser negativo"),
});

const purchaseSchema = z.object({
  purchaseDate: z.string().min(1, "La fecha es requerida"),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Agrega al menos un producto"),
});

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseFormData = z.infer<typeof purchaseSchema>;

export interface PurchaseFormContextValue {
  // Form
  form: UseFormReturn<PurchaseFormData>;
  
  // Field Array
  fields: { id: string }[];
  append: (item: PurchaseFormData["items"][0]) => void;
  remove: (index: number) => void;
  
  // Supplier
  supplier: Supplier | null;
  setSupplier: (supplier: Supplier | null) => void;
  
  // Submit
  onSubmit: () => void;
  isPending: boolean;
  isFormValid: boolean;
  
  // Computed
  totalAmount: number;
  
  // Data
  products?: { id: string; name: string }[];
  isProductsLoading: boolean;
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
  const { data: products, isLoading: isProductsLoading } = useProducts();
  
  const [supplier, setSupplier] = React.useState<Supplier | null>(initialSupplier);
  
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    mode: "onBlur",
    defaultValues: {
      purchaseDate: getToday(),
      notes: "",
      items: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const items = form.watch("items");
  
  const totalAmount = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0),
      0
    );
  }, [items]);
  
  const isFormValid = form.formState.isValid && supplier !== null && fields.length > 0;
  
  const handleSubmit = form.handleSubmit((data) => {
    if (!supplier) {
      form.setError("root", { 
        message: "Debes seleccionar un proveedor" 
      });
      return;
    }
    
    createPurchase(
      { ...data, supplierId: supplier.id },
      {
        onSuccess: () => {
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
  });
  
  const addItem = () => {
    append({ 
      productId: "", 
      variantId: undefined, 
      unitId: undefined, 
      packs: undefined, 
      quantity: 0, 
      unitCost: 0 
    });
  };
  
  const value: PurchaseFormContextValue = {
    form,
    fields,
    append: addItem,
    remove,
    supplier,
    setSupplier,
    onSubmit: handleSubmit,
    isPending,
    isFormValid,
    totalAmount,
    products: products?.map(p => ({ id: p.id, name: p.name })),
    isProductsLoading,
  };
  
  return (
    <PurchaseFormContext.Provider value={value}>
      <FormProvider {...form}>
        {children}
      </FormProvider>
    </PurchaseFormContext.Provider>
  );
}

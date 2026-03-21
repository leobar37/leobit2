import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { usePurchase, useUpdatePurchaseItem, useDeletePurchaseItem, useAddPurchaseItem } from "~/hooks/use-purchases";
import { useSuppliers, type Supplier } from "~/hooks/use-suppliers";
import { useBusiness } from "~/hooks/use-business";
import { useReturnNavigation } from "~/hooks/use-return-navigation";
import { usePurchaseEditorState } from "~/hooks/use-purchase-editor-state";
import type { CreatePurchaseItemInput } from "~/lib/services/purchase-service";

interface PurchaseWithItems {
  id: string;
  business_id: string;
  supplier_id: string;
  purchase_date: string;
  total_amount: string;
  status: string;
  invoice_number: string | null;
  receipt_image_id: string | null;
  notes: string | null;
  sync_status: string;
  sync_attempts: number;
  created_at: string;
  updated_at: string;
  items?: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    quantity: string | number;
    unitCost: string | number;
    totalCost: string | number;
    product?: { name: string } | null;
    variant?: { name: string } | null;
  }>;
}

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

interface PurchaseEditContextType {
  purchaseId: string;
  items: PurchaseItem[];
  setItems: React.Dispatch<React.SetStateAction<PurchaseItem[]>>;
  addItem: (item: PurchaseItem) => void;
  updateItem: (id: string, updates: Partial<PurchaseItem>) => void;
  removeItem: (id: string) => void;
  supplier: Supplier | null;
  totalAmount: number;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  returnTo: string;
}

const PurchaseEditContext = createContext<PurchaseEditContextType | null>(null);

export function usePurchaseEdit() {
  const context = useContext(PurchaseEditContext);
  if (!context) {
    throw new Error("usePurchaseEdit must be used within PurchaseEditProvider");
  }
  return context;
}

interface PurchaseEditProviderProps {
  children: React.ReactNode;
}

export function PurchaseEditProvider({ children }: PurchaseEditProviderProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: purchaseData, isLoading } = usePurchase(id!);
  const purchase = (purchaseData as unknown as Array<{ purchase: PurchaseWithItems }>)?.[0]?.purchase;
  const { data: business } = useBusiness();
  const supplierQueryId = business?.id && business.id.length > 0 ? business.id : "00000000-0000-0000-0000-000000000000";
  const { data: suppliers } = useSuppliers(supplierQueryId);

  const { editingItemId, setEditingItemId } = usePurchaseEditorState();

  const { returnTo } = useReturnNavigation({
    config: {},
    defaultPath: "/compras",
  });

  const [items, setItems] = useState<PurchaseItem[]>([]);

  useEffect(() => {
    if (purchase?.items) {
      const mappedItems: PurchaseItem[] = purchase.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product?.name || "Producto",
        variantName: item.variant?.name || "",
        quantity: String(item.quantity),
        unitCost: String(item.unitCost),
        totalCost: String(item.totalCost),
      }));
      setItems(mappedItems);
    }
  }, [purchase]);

  const supplier = useMemo(() => {
    if (!purchase?.supplier_id || !suppliers) return null;
    return suppliers.find((s: Supplier) => s.id === purchase.supplier_id) || null;
  }, [purchase?.supplier_id, suppliers]);

  const updateMutation = useUpdatePurchaseItem();
  const deleteMutation = useDeletePurchaseItem();
  const addMutation = useAddPurchaseItem();

  const addItem = useCallback((item: PurchaseItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback((itemId: string, updates: Partial<PurchaseItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.unitCost !== undefined) {
          const qty = parseFloat(updated.quantity) || 0;
          const cost = parseFloat(updated.unitCost) || 0;
          updated.totalCost = (qty * cost).toFixed(2);
        }
        return updated;
      })
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.totalCost) || 0);
    }, 0);
  }, [items]);

  const onSave = useCallback(async () => {
    if (!id || !purchase) return;

    const originalItems = purchase.items?.map((item) => item.id) || [];
    const currentItems = items.map((item) => item.id);

    const itemsToAdd = items.filter((item) => !originalItems.includes(item.id));
    const itemsToDelete = originalItems.filter((origId: string) => !currentItems.includes(origId));
    const itemsToUpdate = items.filter((item) => {
      const original = purchase.items?.find((i) => i.id === item.id);
      if (!original) return false;
      return (
        parseFloat(String(original.quantity)) !== parseFloat(item.quantity) ||
        parseFloat(String(original.unitCost)) !== parseFloat(item.unitCost)
      );
    });

    for (const itemId of itemsToDelete) {
      await deleteMutation.mutateAsync({ purchaseId: id, itemId });
    }

    for (const item of itemsToUpdate) {
      await updateMutation.mutateAsync({
        purchaseId: id,
        itemId: item.id,
        data: {
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost),
          totalCost: parseFloat(item.totalCost),
        },
      });
    }

    for (const item of itemsToAdd) {
      const newItem: CreatePurchaseItemInput = {
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: parseFloat(item.quantity),
        unitCost: parseFloat(item.unitCost),
      };
      await addMutation.mutateAsync({ purchaseId: id, item: newItem });
    }

    navigate(`/compras/${id}`);
  }, [id, purchase, items, deleteMutation, updateMutation, addMutation, navigate]);

  const onCancel = useCallback(() => {
    navigate(`/compras/${id}`);
  }, [navigate, id]);

  const value: PurchaseEditContextType = {
    purchaseId: id!,
    items,
    setItems,
    addItem,
    updateItem,
    removeItem,
    supplier,
    totalAmount,
    isLoading,
    isSaving: updateMutation.isPending || deleteMutation.isPending || addMutation.isPending,
    onSave,
    onCancel,
    editingItemId,
    setEditingItemId,
    returnTo,
  };

  return (
    <PurchaseEditContext.Provider value={value}>
      {children}
    </PurchaseEditContext.Provider>
  );
}
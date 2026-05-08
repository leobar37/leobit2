/**
 * Hook for managing purchase items state
 * Extracted from PurchaseFormContext for better testability
 */
import { useState, useCallback, useMemo } from "react";

export interface PurchaseItem {
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

export interface UsePurchaseItemsReturn {
  items: PurchaseItem[];
  setItems: (items: PurchaseItem[]) => void;
  addItem: (item: Omit<PurchaseItem, "id">) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<Omit<PurchaseItem, "id">>) => void;
  totalAmount: number;
  cartItemsCount: number;
}

export function usePurchaseItems(): UsePurchaseItemsReturn {
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const addItem = useCallback((item: Omit<PurchaseItem, "id">) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateItem = useCallback(
    (itemId: string, updates: Partial<Omit<PurchaseItem, "id">>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0);
  }, [items]);

  return {
    items,
    setItems,
    addItem,
    removeItem,
    updateItem,
    totalAmount,
    cartItemsCount: items.length,
  };
}

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router";

interface EditingItem {
  itemId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface NewSaleContextType {
  saleId: string | null;
  editingItem: EditingItem | null;
  setEditingItem: (item: EditingItem | null) => void;
}

const NewSaleContext = createContext<NewSaleContextType | null>(null);

export function NewSaleProvider({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const value = useMemo(
    () => ({
      saleId: id ?? null,
      editingItem,
      setEditingItem,
    }),
    [id, editingItem]
  );

  return (
    <NewSaleContext.Provider value={value}>
      {children}
    </NewSaleContext.Provider>
  );
}

export function useNewSaleContext() {
  const context = useContext(NewSaleContext);

  if (!context) {
    throw new Error("useNewSaleContext must be used within NewSaleProvider");
  }

  return context;
}

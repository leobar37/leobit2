import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { useReturnNavigation } from "~/hooks/use-return-navigation";
import { useSaleEditorState } from "~/hooks/use-sale-editor-state";
import { useSale } from "~/hooks/use-sales-db";
import type { SaleItem } from "~/lib/services/sale-service";

interface NewSaleContextType {
  saleId: string | null;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  visitaId: string | null;
  setLinkedVisitaId: (id: string | null) => void;
  returnTo: string;
  sale: ReturnType<typeof useSale>["data"];
  items: SaleItem[];
  isSaleLoading: boolean;
}

const NewSaleContext = createContext<NewSaleContextType | null>(null);

interface NewSaleProviderProps {
  children: ReactNode;
  linkedVisitaId?: string | null;
}

export function NewSaleProvider({ children, linkedVisitaId: initialLinkedVisitaId }: NewSaleProviderProps) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { editingItemId, setEditingItemId } = useSaleEditorState();
  const [linkedVisitaId, setLinkedVisitaId] = useState<string | null>(initialLinkedVisitaId ?? null);

  const saleId = id ?? null;
  const { data: sale, isLoading: isSaleLoading } = useSale(saleId);
  const items = useMemo(() => sale?.items ?? [], [sale?.items]);

  const urlVisitaId = searchParams.get("visitaId");
  const effectiveVisitaId = urlVisitaId || linkedVisitaId || null;

  const { returnTo } = useReturnNavigation({
    config: {
      visitaId: "/visitas",
    },
    defaultPath: "/ventas",
    overrideKey: effectiveVisitaId ? "visitaId" : undefined,
  });

  const value = useMemo(
    () => ({
      saleId,
      editingItemId,
      setEditingItemId,
      visitaId: effectiveVisitaId,
      setLinkedVisitaId,
      returnTo,
      sale,
      items,
      isSaleLoading,
    }),
    [saleId, editingItemId, effectiveVisitaId, returnTo, sale, items, isSaleLoading]
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
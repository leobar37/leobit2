import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { useReturnNavigation } from "~/hooks/use-return-navigation";
import { useSaleEditorState } from "~/hooks/use-sale-editor-state";

interface NewSaleContextType {
  saleId: string | null;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  visitaId: string | null;
  setLinkedVisitaId: (id: string | null) => void;
  returnTo: string;
}

const NewSaleContext = createContext<NewSaleContextType | null>(null);

interface NewSaleProviderProps {
  children: ReactNode;
  /** Linked visitaId from the sale record itself (for sales created from visits) */
  linkedVisitaId?: string | null;
}

export function NewSaleProvider({ children, linkedVisitaId: initialLinkedVisitaId }: NewSaleProviderProps) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { editingItemId, setEditingItemId } = useSaleEditorState();
  const [linkedVisitaId, setLinkedVisitaId] = useState<string | null>(initialLinkedVisitaId ?? null);

  const urlVisitaId = searchParams.get("visitaId");

  // Use URL visitaId if present, otherwise fall back to linked visitaId from sale
  const effectiveVisitaId = urlVisitaId || linkedVisitaId || null;

  const { returnTo } = useReturnNavigation({
    config: {
      visitaId: "/visitas",
    },
    defaultPath: "/ventas",
    // Override the param key to use our effective visitaId
    overrideKey: effectiveVisitaId ? "visitaId" : undefined,
  });

  const value = useMemo(
    () => ({
      saleId: id ?? null,
      editingItemId,
      setEditingItemId,
      visitaId: effectiveVisitaId,
      setLinkedVisitaId,
      returnTo,
    }),
    [id, editingItemId, effectiveVisitaId, returnTo]
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
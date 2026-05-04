import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { useReturnNavigation } from "~/hooks/use-return-navigation";
import { useSale } from "~/hooks/use-sales-db";
import type { SaleItem, SaleWithItems } from "~/hooks/use-sales";

interface NewSaleContextType {
  saleId: string | null;
  visitaId: string | null;
  setLinkedVisitaId: (id: string | null) => void;
  returnTo: string;
  sale: SaleWithItems | null;
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
  const [linkedVisitaId, setLinkedVisitaId] = useState<string | null>(initialLinkedVisitaId ?? null);

  const saleId = id ?? null;
  const { data: saleRaw, isLoading: isSaleLoading } = useSale(saleId);
  const sale = saleRaw ?? null;
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
      visitaId: effectiveVisitaId,
      setLinkedVisitaId,
      returnTo,
      sale,
      items,
      isSaleLoading,
    }),
    [saleId, effectiveVisitaId, returnTo, sale, items, isSaleLoading]
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
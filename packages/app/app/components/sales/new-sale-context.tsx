import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useParams } from "react-router";

interface NewSaleContextType {
  saleId: string | null;
}

const NewSaleContext = createContext<NewSaleContextType | null>(null);

export function NewSaleProvider({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();

  const value = useMemo(
    () => ({ saleId: id ?? null }),
    [id]
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

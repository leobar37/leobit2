import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { useReturnNavigation } from "~/hooks/use-return-navigation";
import { useSale } from "~/hooks/use-sales-db";
import type { SaleItem, SaleWithItems } from "~/hooks/use-sales";
import {
  salePaymentCache,
  DEFAULT_PAYMENT_FORM,
  type SalePaymentForm,
} from "~/lib/cache/sale-payment-cache";

interface NewSaleContextType {
  saleId: string | null;
  visitaId: string | null;
  setLinkedVisitaId: (id: string | null) => void;
  returnTo: string;
  sale: SaleWithItems | null;
  items: SaleItem[];
  isSaleLoading: boolean;
  paymentForm: SalePaymentForm;
  updatePaymentForm: (updates: Partial<SalePaymentForm>) => void;
  resetPaymentForm: () => void;
}

const NewSaleContext = createContext<NewSaleContextType | null>(null);

interface NewSaleProviderProps {
  children: ReactNode;
  linkedVisitaId?: string | null;
}

function buildInitialPaymentForm(
  sale: SaleWithItems | null,
  saleId: string | null
): SalePaymentForm {
  if (!saleId) return DEFAULT_PAYMENT_FORM;

  const cached = salePaymentCache.get(saleId);
  if (cached) return cached;

  // Seed from existing sale data if available
  if (sale?.paymentMode) {
    return {
      paymentMode: sale.paymentMode,
      amountPaid: sale.paymentMode === "a_cuenta" ? sale.amountPaid || "" : "",
      paymentMethod: (sale.paymentMethod as SalePaymentForm["paymentMethod"]) || null,
      referenceNumber: sale.advanceReferenceNumber || "",
      proofImageId: sale.advanceProofImageId || null,
    };
  }

  return DEFAULT_PAYMENT_FORM;
}

export function NewSaleProvider({ children, linkedVisitaId: initialLinkedVisitaId }: NewSaleProviderProps) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [linkedVisitaId, setLinkedVisitaId] = useState<string | null>(initialLinkedVisitaId ?? null);

  const saleId = id ?? null;
  const { data: saleRaw, isLoading: isSaleLoading } = useSale(saleId);
  const sale = saleRaw ?? null;
  const items = useMemo(() => sale?.items ?? [], [sale?.items]);

  const [paymentForm, setPaymentForm] = useState<SalePaymentForm>(() =>
    buildInitialPaymentForm(sale, saleId)
  );

  const updatePaymentForm = useCallback(
    (updates: Partial<SalePaymentForm>) => {
      setPaymentForm((prev) => {
        const next = { ...prev, ...updates };
        if (saleId) {
          salePaymentCache.set(saleId, next);
        }
        return next;
      });
    },
    [saleId]
  );

  const resetPaymentForm = useCallback(() => {
    setPaymentForm(DEFAULT_PAYMENT_FORM);
    if (saleId) {
      salePaymentCache.remove(saleId);
    }
  }, [saleId]);

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
      paymentForm,
      updatePaymentForm,
      resetPaymentForm,
    }),
    [saleId, effectiveVisitaId, returnTo, sale, items, isSaleLoading, paymentForm, updatePaymentForm, resetPaymentForm]
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
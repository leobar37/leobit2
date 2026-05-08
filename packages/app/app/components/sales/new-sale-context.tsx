import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
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
  hasOptimisticItems: boolean;
  paymentForm: SalePaymentForm;
  updatePaymentForm: (updates: Partial<SalePaymentForm>) => void;
  resetPaymentForm: () => void;
}

const NewSaleContext = createContext<NewSaleContextType | null>(null);

interface NewSaleProviderProps {
  children: ReactNode;
  linkedVisitaId?: string | null;
}

function buildPaymentFormFromSale(sale: SaleWithItems): SalePaymentForm {
  return {
    paymentMode: sale.paymentMode ?? DEFAULT_PAYMENT_FORM.paymentMode,
    amountPaid: sale.paymentMode === "a_cuenta" ? sale.amountPaid || "" : "",
    paymentMethod: (sale.paymentMethod as SalePaymentForm["paymentMethod"]) || null,
    referenceNumber: sale.advanceReferenceNumber || "",
    proofImageId: sale.advanceProofImageId || null,
  };
}

function buildInitialPaymentForm(sale: SaleWithItems | null, saleId: string | null): SalePaymentForm {
  if (!saleId) return DEFAULT_PAYMENT_FORM;

  const cached = salePaymentCache.get(saleId);
  if (cached) return cached;

  return sale ? buildPaymentFormFromSale(sale) : DEFAULT_PAYMENT_FORM;
}

export function NewSaleProvider({ children, linkedVisitaId: initialLinkedVisitaId }: NewSaleProviderProps) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [linkedVisitaId, setLinkedVisitaId] = useState<string | null>(initialLinkedVisitaId ?? null);

  const saleId = id ?? null;
  const { data: saleRaw, isLoading: isSaleLoading } = useSale(saleId);
  const sale = saleRaw ?? null;
  const items = useMemo(() => sale?.items ?? [], [sale?.items]);
  const hasOptimisticItems = useMemo(
    () => items.some((item) => item.isOptimistic),
    [items]
  );

  const [paymentForm, setPaymentForm] = useState<SalePaymentForm>(() =>
    buildInitialPaymentForm(sale, saleId)
  );

  useEffect(() => {
    if (!saleId || !sale) return;
    if (salePaymentCache.get(saleId)) return;

    const next = buildPaymentFormFromSale(sale);
    setPaymentForm(next);
    salePaymentCache.set(saleId, next);
  }, [
    saleId,
    sale?.paymentMode,
    sale?.amountPaid,
    sale?.paymentMethod,
    sale?.advanceReferenceNumber,
    sale?.advanceProofImageId,
  ]);

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
      hasOptimisticItems,
      paymentForm,
      updatePaymentForm,
      resetPaymentForm,
    }),
    [saleId, effectiveVisitaId, returnTo, sale, items, isSaleLoading, hasOptimisticItems, paymentForm, updatePaymentForm, resetPaymentForm]
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

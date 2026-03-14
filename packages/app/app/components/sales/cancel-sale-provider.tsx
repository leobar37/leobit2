import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCancelSale } from "~/hooks/use-sales";
import type { CancelSaleInput, Sale } from "~/hooks/use-sales";

type RefundMethod = NonNullable<CancelSaleInput["refundMethod"]>;
type CancelMode = "simple" | "complete" | "custom";

const refundMethodValues = [
  "efectivo",
  "yape",
  "plin",
  "transferencia",
  "saldo",
] as const;

const cancelSaleSchema = z.object({
  reason: z.string().trim().min(1, "El motivo es requerido"),
  cancelMode: z.enum(["simple", "complete", "custom"]),
  hasRefund: z.boolean(),
  refundAmount: z.string(),
  refundMethod: z.enum(refundMethodValues),
  refundReference: z.string(),
  reverseAbones: z.boolean(),
  restoreInventory: z.boolean(),
});

export type CancelSaleFormValues = z.infer<typeof cancelSaleSchema>;

interface CancelSaleContextValue {
  form: UseFormReturn<CancelSaleFormValues>;
  isOpen: boolean;
  isCancelling: boolean;
  paidAmount: number;
  saleNumber: string;
  open: () => void;
  close: () => void;
  handleOpenChange: (open: boolean) => void;
  submit: () => void;
}

interface CancelSaleProviderProps {
  children: React.ReactNode;
  sale: Sale;
}

const CancelSaleContext = createContext<CancelSaleContextValue | null>(null);

function getDefaultValues(paidAmount: number): CancelSaleFormValues {
  return {
    reason: "",
    cancelMode: "simple",
    hasRefund: false,
    refundAmount: paidAmount > 0 ? paidAmount.toString() : "",
    refundMethod: "efectivo",
    refundReference: "",
    reverseAbones: false,
    restoreInventory: false,
  };
}

export function CancelSaleProvider({
  children,
  sale,
}: CancelSaleProviderProps) {
  const cancelSale = useCancelSale();
  const [isOpen, setIsOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isMountedRef = useRef(true);
  const saleId = sale.id;
  const saleNumber = sale.id.slice(-6);
  const paidAmount = Number(sale.amountPaid ?? 0);
  const form = useForm<CancelSaleFormValues>({
    resolver: zodResolver(cancelSaleSchema),
    defaultValues: getDefaultValues(paidAmount),
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resetForm = useCallback(() => {
    form.reset(getDefaultValues(paidAmount));
  }, [form, paidAmount]);

  const close = useCallback(() => {
    setIsOpen(false);
    resetForm();
  }, [resetForm]);

  const open = useCallback(() => {
    resetForm();
    setIsOpen(true);
  }, [resetForm]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        open();
        return;
      }

      close();
    },
    [close, open],
  );

  const submit = form.handleSubmit(async (values) => {
    const payload: CancelSaleInput = {
      reason: values.reason,
      cancelMode: values.cancelMode,
    };

    if (values.hasRefund && paidAmount > 0) {
      const parsedRefund = Number.parseFloat(values.refundAmount);
      payload.refundAmount =
        Number.isFinite(parsedRefund) && parsedRefund > 0
          ? Math.min(parsedRefund, paidAmount)
          : paidAmount;
      payload.refundMethod = values.refundMethod;
      if (values.refundReference.trim()) {
        payload.refundReference = values.refundReference.trim();
      }
    }

    if (values.cancelMode === "complete") {
      payload.reverseAbones = true;
      payload.restoreInventory = true;
    } else if (values.cancelMode === "custom") {
      payload.reverseAbones = values.reverseAbones;
      payload.restoreInventory = values.restoreInventory;
    }

    try {
      setIsCancelling(true);
      await cancelSale(saleId, payload);
      close();
    } finally {
      if (isMountedRef.current) {
        setIsCancelling(false);
      }
    }
  });

  const value = useMemo<CancelSaleContextValue>(
    () => ({
      form,
      isOpen,
      isCancelling,
      paidAmount,
      saleNumber,
      open,
      close,
      handleOpenChange,
      submit,
    }),
    [close, form, handleOpenChange, isCancelling, isOpen, open, paidAmount, saleNumber, submit],
  );

  return (
    <CancelSaleContext.Provider value={value}>
      <FormProvider {...form}>{children}</FormProvider>
    </CancelSaleContext.Provider>
  );
}

export function useCancelSaleDialog() {
  const context = useContext(CancelSaleContext);

  if (!context) {
    throw new Error("useCancelSaleDialog must be used within CancelSaleProvider");
  }

  return context;
}

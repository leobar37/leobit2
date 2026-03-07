"use client";

import React, { createContext, useContext } from "react";
import { useOrderForm, type UseOrderFormReturn } from "~/hooks/use-order-form";

const OrderFormContext = createContext<UseOrderFormReturn | null>(null);

export function useOrderFormContext() {
  const context = useContext(OrderFormContext);
  if (!context) {
    throw new Error("useOrderFormContext must be used within OrderFormProvider");
  }
  return context;
}

interface OrderFormProviderProps {
  children: React.ReactNode;
  isSubmitting?: boolean;
  onNavigateToCalculadora?: () => void;
  onSubmit: (data: {
    clientId: string;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    totalAmount: number;
    items: Array<{
      productId: string;
      variantId: string;
      productName: string;
      variantName: string;
      orderedQuantity: number;
      unitPriceQuoted: number;
    }>;
  }) => void;
  initialOrder?: {
    clientId: string;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    paymentStatus?: "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente";
    advanceAmount?: number;
    balanceDue?: number;
    advancePaymentMethod?: "efectivo" | "yape" | "plin" | "transferencia";
    advanceReferenceNumber?: string;
    totalAmount: number;
    items: Array<{
      productId: string;
      variantId: string;
      productName: string;
      variantName: string;
      orderedQuantity: number;
      unitPriceQuoted: number;
    }>;
  };
}

export function OrderFormProvider({
  children,
  onSubmit,
  isSubmitting,
  onNavigateToCalculadora,
  initialOrder,
}: OrderFormProviderProps) {
  const form = useOrderForm({ onSubmit, isSubmitting, onNavigateToCalculadora, initialOrder });

  return (
    <OrderFormContext.Provider value={form}>
      {children}
    </OrderFormContext.Provider>
  );
}

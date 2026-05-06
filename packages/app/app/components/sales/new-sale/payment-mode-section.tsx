import { useCallback } from "react";
import { CreditCard, Wallet, Receipt, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AmountPaidInput } from "~/components/sales/amount-paid-input";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { formatCurrency, cn } from "~/lib/utils";
import type { PaymentMode } from "~/lib/sales/types";
import { useNewSaleContext } from "../new-sale-context";
import { PaymentCapture } from "~/components/payments/payment-capture";
import type { PaymentMethod } from "~/components/payments/payment-capture";
import { useUploadFile } from "~/hooks/use-files";
import { useBusinessMode } from "~/hooks/use-business-mode";

const paymentModes: {
  value: PaymentMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "pago_total",
    label: "Pago Total",
    icon: <Wallet className="h-5 w-5" />,
    description: "El cliente paga todo en efectivo",
  },
  {
    value: "a_cuenta",
    label: "A Cuenta",
    icon: <CreditCard className="h-5 w-5" />,
    description: "El cliente da un adelanto",
  },
  {
    value: "debe_todo",
    label: "Debe Todo",
    icon: <Receipt className="h-5 w-5" />,
    description: "El cliente paga después",
  },
];

function getPaymentModeRequiresCustomerMessage(mode: PaymentMode) {
  if (mode === "a_cuenta") {
    return {
      title: "Selecciona un cliente",
      description:
        "A Cuenta crea una venta a crédito, por eso necesitas asociar un cliente antes de guardar.",
    };
  }

  if (mode === "debe_todo") {
    return {
      title: "Selecciona un cliente",
      description:
        "Debe Todo crea una venta a crédito, por eso necesitas asociar un cliente antes de guardar.",
    };
  }

  return null;
}

export function PaymentModeSection() {
  const { saleId, sale, items, paymentForm, updatePaymentForm } = useNewSaleContext();
  const uploadFile = useUploadFile();
  const { mode: businessMode } = useBusinessMode();

  const calculations = useSaleCalculations(sale, items);

  const availablePaymentModes = businessMode === "agua"
    ? paymentModes.filter((mode) => mode.value === "pago_total")
    : paymentModes;

  const handleSetPaymentMode = useCallback(
    (mode: PaymentMode) => {
      if (!saleId) return;

      const nextSaleType = mode === "pago_total" ? "contado" : "credito";
      const requiresCustomer = nextSaleType === "credito";

      if (requiresCustomer && !sale?.customerId) {
        const message = getPaymentModeRequiresCustomerMessage(mode);
        // Toast is handled by the parent or we can use a simple alert
        // For now, just don't change
        return;
      }

      updatePaymentForm({ paymentMode: mode });
    },
    [saleId, sale?.customerId, updatePaymentForm]
  );

  const handleProofUpload = useCallback(
    async (file: File) => {
      if (!saleId) return;
      try {
        const result = await uploadFile.mutateAsync(file);
        updatePaymentForm({ proofImageId: result.id });
      } catch {
        // Error handled by uploadFile hook
      }
    },
    [saleId, uploadFile, updatePaymentForm]
  );

  const handleProofRemove = useCallback(() => {
    updatePaymentForm({ proofImageId: null });
  }, [updatePaymentForm]);

  if (!saleId || items.length === 0) {
    return null;
  }

  const visiblePaymentMode = paymentForm.paymentMode;

  return (
    <Card className="rounded-[26px] border-0 bg-transparent shadow-none">
      <CardContent className="space-y-3 px-0 py-1">
        <div className="space-y-2">
          {availablePaymentModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleSetPaymentMode(mode.value)}
              className={cn(
                "w-full flex items-center gap-3 rounded-[20px] border-0 p-3 text-left transition-colors",
                visiblePaymentMode === mode.value
                  ? "bg-orange-500/[0.12]"
                  : "bg-white/[0.045] hover:bg-white/[0.07]",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl",
                  visiblePaymentMode === mode.value
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-white/[0.06] text-muted-foreground",
                )}
              >
                {mode.icon}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "font-medium",
                    visiblePaymentMode === mode.value && "text-orange-300",
                  )}
                >
                  {mode.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode.description}
                </p>
              </div>
              {visiblePaymentMode === mode.value && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {businessMode === "agua" && (
          <p className="rounded-2xl bg-sky-500/10 px-3 py-2 text-sm text-sky-800 dark:text-sky-100">
            En reparto de agua, el flujo principal es pago contra entrega.
          </p>
        )}

        {visiblePaymentMode === "a_cuenta" && (
          <div className="space-y-4">
            <AmountPaidInput
              totalAmount={calculations.totalAmount}
              value={paymentForm.amountPaid}
              onChange={(value) => updatePaymentForm({ amountPaid: value })}
            />
            <div className="border-t pt-3 shell-divider">
              <PaymentCapture
                variant="inline"
                paymentMethod={paymentForm.paymentMethod}
                onPaymentMethodChange={(method) =>
                  updatePaymentForm({ paymentMethod: method })
                }
                referenceNumber={paymentForm.referenceNumber}
                onReferenceNumberChange={(ref) =>
                  updatePaymentForm({ referenceNumber: ref })
                }
                proofImageId={paymentForm.proofImageId}
                onProofUpload={handleProofUpload}
                onProofRemove={handleProofRemove}
                isUploading={uploadFile.isPending}
              />
            </div>
          </div>
        )}

        {visiblePaymentMode === "debe_todo" && calculations.totalAmount > 0 && (
          <div className="border-t pt-3 shell-divider">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total a deber:</span>
              <span className="font-medium text-orange-600">
                S/ {formatCurrency(calculations.totalAmount)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

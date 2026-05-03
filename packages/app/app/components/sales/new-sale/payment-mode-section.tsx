import { useState, useCallback, useEffect } from "react";
import { CreditCard, Wallet, Receipt, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountPaidInput } from "~/components/sales/amount-paid-input";
import { FormMediaField } from "~/components/forms/form-media-field";
import { useUpdateSale } from "~/hooks/use-sales";
import {
  getAmountPaidValue,
  getBalanceDue,
  getSaleType,
  useSaleCalculations,
} from "~/hooks/use-sale-calculations";
import { formatCurrency, cn } from "~/lib/utils";
import type { PaymentMode } from "~/lib/sales/types";
import { useNewSaleContext } from "../new-sale-context";
import { useToast } from "~/hooks/use-toast";
import { useWrapperForm, WrapperFormProvider } from "~/hooks/use-wrapper-form";
import { fileField } from "~/lib/forms/media-field-resolvers";

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

const paymentMethodOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
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
  const { saleId, sale, items, paymentMethod, setPaymentMethod, referenceNumber, setReferenceNumber, proofImageId, setProofImageId } = useNewSaleContext();
  const updateSale = useUpdateSale();
  const { toast } = useToast();

  const calculations = useSaleCalculations(sale, items);
  const [pendingPaymentMode, setPendingPaymentMode] = useState<PaymentMode | null>(null);

  const visiblePaymentMode = pendingPaymentMode ?? sale?.paymentMode;

  const wrapperForm = useWrapperForm({
    defaultValues: {
      proofImageId: proofImageId || undefined,
    },
    fields: {
      proofImageId: fileField(),
    },
  });

  const watchedProofImageId = wrapperForm.watch("proofImageId");
  useEffect(() => {
    if (watchedProofImageId !== proofImageId) {
      setProofImageId(watchedProofImageId || null);
    }
  }, [watchedProofImageId, proofImageId, setProofImageId]);

  const handleUpdateAmountPaid = useCallback(
    async (amount: string) => {
      if (!saleId) return;

      const amountPaid = parseFloat(amount) || 0;
      const totalAmount = calculations.totalAmount;

      if (amountPaid <= 0 || amountPaid > totalAmount) {
        return;
      }

      try {
        await updateSale.mutateAsync({
          id: saleId,
          input: {
            paymentMode: "a_cuenta",
            saleType: "credito",
            totalAmount,
            amountPaid,
          },
        });

        setPendingPaymentMode(null);
      } catch (error) {
        toast.error("Error al guardar adelanto", {
          description:
            error instanceof Error
              ? error.message
              : "No se pudo actualizar el monto pagado",
        });
      }
    },
    [saleId, calculations.totalAmount, updateSale, toast]
  );

  if (!saleId || items.length === 0) {
    return null;
  }

  const handleSetPaymentMode = async (mode: PaymentMode) => {
    if (!saleId) return;

    const totalAmountNum = calculations.totalAmount;
    const nextSaleType = getSaleType(mode);
    const requiresCustomer = nextSaleType === "credito";

    if (requiresCustomer && !sale?.customerId) {
      const message = getPaymentModeRequiresCustomerMessage(mode);

      toast.error(message?.title ?? "Selecciona un cliente", {
        description:
          message?.description ??
          "Las ventas a crédito necesitan un cliente asociado.",
      });

      return;
    }

    if (mode === "a_cuenta") {
      setPendingPaymentMode("a_cuenta");
      return;
    }

    setPaymentMethod(null);
    setReferenceNumber("");
    setProofImageId(null);

    const amountPaidNum = getAmountPaidValue(
      mode,
      totalAmountNum,
      sale?.amountPaid || "0",
    );
    const nextBalanceDue = getBalanceDue(
      nextSaleType,
      totalAmountNum,
      amountPaidNum,
    );

    try {
      setPendingPaymentMode(null);

      await updateSale.mutateAsync({
        id: saleId,
        input: {
          paymentMode: mode,
          saleType: nextSaleType,
          totalAmount: totalAmountNum,
          amountPaid: amountPaidNum,
          balanceDue: nextBalanceDue,
        },
      });
    } catch (error) {
      toast.error("Error al cambiar modo de pago", {
        description:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el modo de pago",
      });
    }
  };

  const showPaymentDetails = visiblePaymentMode === "a_cuenta" && sale?.paymentMode === "a_cuenta";

  return (
    <Card className="rounded-[26px] border-0 bg-transparent shadow-none">
      <CardContent className="space-y-3 px-0 py-1">
        <div className="space-y-2">
          {paymentModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleSetPaymentMode(mode.value)}
              disabled={updateSale.isPending}
              className={cn(
                "w-full flex items-center gap-3 rounded-[20px] border-0 p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                visiblePaymentMode === mode.value
                  ? "bg-orange-500/12"
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

        {visiblePaymentMode === "a_cuenta" && saleId && (
          <AmountPaidInput
            saleId={saleId}
            totalAmount={calculations.totalAmount}
            initialAmount={sale?.paymentMode === "a_cuenta" ? sale?.amountPaid || "" : ""}
            onUpdate={handleUpdateAmountPaid}
          />
        )}

        {showPaymentDetails && (
          <WrapperFormProvider form={wrapperForm}>
            <div className="space-y-4 border-t pt-3 shell-divider">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Método de pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethodOptions.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        paymentMethod === method.value
                          ? "bg-orange-500 text-white"
                          : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
                      )}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod && paymentMethod !== "efectivo" && (
                <div className="space-y-2">
                  <Label htmlFor="reference" className="text-sm font-medium">
                    Número de operación (opcional)
                  </Label>
                  <Input
                    id="reference"
                    placeholder="Ej: 123456"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
              )}

              {paymentMethod && paymentMethod !== "efectivo" && (
                <div className="space-y-2">
                  <FormMediaField
                    name="proofImageId"
                    label="Comprobante de pago (opcional)"
                  />
                </div>
              )}
            </div>
          </WrapperFormProvider>
        )}

        {pendingPaymentMode === "a_cuenta" && (
          <p className="rounded-2xl bg-orange-500/10 px-3 py-2 text-sm text-orange-700 dark:text-orange-300">
            Ingresa el adelanto para guardar este modo de pago.
          </p>
        )}

        {sale?.paymentMode === "debe_todo" && calculations.totalAmount > 0 && (
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

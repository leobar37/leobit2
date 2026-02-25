import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import {
  amountPaidAtom,
  paymentModeAtom,
  requiresCustomerAtom,
  selectedCustomerAtom,
  submitErrorAtom,
} from "~/atoms/new-sale";

export function PaymentModeSection() {
  const [paymentMode, setPaymentMode] = useAtom(paymentModeAtom);
  const [submitError, setSubmitError] = useAtom(submitErrorAtom);
  const [, setAmountPaid] = useAtom(amountPaidAtom);
  const requiresCustomer = useAtomValue(requiresCustomerAtom);
  const selectedCustomer = useAtomValue(selectedCustomerAtom);

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">Tipo de Cobro</h2>
      <div className="flex gap-2">
        <Button
          variant={paymentMode === "pago_total" ? "default" : "outline"}
          onClick={() => {
            setPaymentMode("pago_total");
            if (submitError) {
              setSubmitError(null);
            }
          }}
          className={cn(
            "flex-1 rounded-xl",
            paymentMode === "pago_total" && "bg-orange-500 hover:bg-orange-600",
          )}
        >
          Pago total
        </Button>
        <Button
          variant={paymentMode === "a_cuenta" ? "default" : "outline"}
          onClick={() => {
            setPaymentMode("a_cuenta");
            if (submitError) {
              setSubmitError(null);
            }
          }}
          className={cn(
            "flex-1 rounded-xl",
            paymentMode === "a_cuenta" && "bg-orange-500 hover:bg-orange-600",
          )}
        >
          A cuenta
        </Button>
        <Button
          variant={paymentMode === "debe_todo" ? "default" : "outline"}
          onClick={() => {
            setPaymentMode("debe_todo");
            setAmountPaid("0");
            if (submitError) {
              setSubmitError(null);
            }
          }}
          className={cn(
            "flex-1 rounded-xl",
            paymentMode === "debe_todo" && "bg-orange-500 hover:bg-orange-600",
          )}
        >
          Debe
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {paymentMode === "pago_total" && "Pago completo hoy, no aumenta deuda."}
        {paymentMode === "a_cuenta" &&
          "Venta a credito con abono inicial para reducir la deuda."}
        {paymentMode === "debe_todo" &&
          "Venta a credito sin abono inicial, toda la venta queda como deuda."}
      </p>
      {requiresCustomer && !selectedCustomer && (
        <p className="text-xs text-red-600 mt-1">
          Selecciona un cliente para registrar venta a credito.
        </p>
      )}
    </section>
  );
}

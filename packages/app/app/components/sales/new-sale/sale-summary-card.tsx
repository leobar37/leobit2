import { Card, CardContent } from "@/components/ui/card";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { formatCurrency } from "~/lib/utils";
import { useNewSaleContext } from "../new-sale-context";

export function SaleSummaryCard() {
  const { sale, items } = useNewSaleContext();

  const calculations = useSaleCalculations(sale, items);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-3xl border border-orange-300/50 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white shadow-[0_22px_48px_rgba(249,115,22,0.24)]">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-orange-100">Total productos:</span>
          <span className="font-semibold">{items.length}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-orange-100">Monto total:</span>
          <span className="text-2xl font-bold">
            S/ {formatCurrency(calculations.totalAmount)}
          </span>
        </div>

        {sale?.paymentMode === "a_cuenta" && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-orange-100">Pagado:</span>
              <span className="font-semibold">
                S/ {formatCurrency(calculations.amountPaidValue)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-orange-300/70">
              <span className="text-orange-100">Saldo:</span>
              <span className="font-bold">
                S/ {formatCurrency(calculations.balanceDue)}
              </span>
            </div>
          </>
        )}

        {sale?.paymentMode === "debe_todo" && (
          <div className="flex justify-between items-center pt-2 border-t border-orange-300/70">
            <span className="text-orange-100">Total a deber:</span>
            <span className="font-bold">
              S/ {formatCurrency(calculations.totalAmount)}
            </span>
          </div>
        )}

        {!calculations.canSubmit && (
          <div className="rounded-2xl bg-white/18 p-3 text-center text-sm backdrop-blur-sm">
            {items.length === 0
              ? "Agrega productos para continuar"
              : calculations.requiresCustomer && !sale?.customerId
                ? "Selecciona un cliente para venta a crédito"
                : "Revisa el monto pagado"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSaleStore,
  getTotalAmount,
  getSaleType,
  getAmountPaidValue,
  getBalanceDue,
} from "~/stores/sale.store";

export function SaleSummaryCard() {
  const cartItems = useSaleStore((state) => state.cartItems);
  const paymentMode = useSaleStore((state) => state.paymentMode);
  const amountPaid = useSaleStore((state) => state.amountPaid);
  const setAmountPaid = useSaleStore((state) => state.setAmountPaid);
  const submitError = useSaleStore((state) => state.submitError);

  // Compute derived values
  const totalAmount = getTotalAmount(cartItems);
  const saleType = getSaleType(paymentMode);
  const amountPaidValue = getAmountPaidValue(paymentMode, totalAmount, amountPaid);
  const balanceDue = getBalanceDue(saleType, totalAmount, amountPaidValue);

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white" data-testid="sale-summary-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-orange-100">Total</span>
          <span className="text-2xl font-bold" data-testid="sale-total-amount">S/ {totalAmount.toFixed(2)}</span>
        </div>

        {paymentMode === "a_cuenta" && (
          <div className="space-y-2">
            <Label htmlFor="initial-payment-input" className="text-orange-100">
              Abono inicial
            </Label>
            <Input
              id="initial-payment-input"
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              data-testid="initial-payment-input"
              className="rounded-xl bg-white/20 border-white/30 text-white placeholder:text-white/50"
              placeholder="0.00"
            />
          </div>
        )}

        {saleType === "credito" && (
          <div className="flex items-center justify-between text-orange-100">
            <span>Saldo pendiente</span>
            <span data-testid="sale-balance-due">S/ {balanceDue.toFixed(2)}</span>
          </div>
        )}

        {submitError && (
          <p className="text-sm text-red-100 bg-red-500/20 rounded-lg px-3 py-2" data-testid="submit-error-message">{submitError}</p>
        )}
      </CardContent>
    </Card>
  );
}

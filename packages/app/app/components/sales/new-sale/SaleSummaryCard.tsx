import { useAtom, useAtomValue } from "jotai";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  amountPaidAtom,
  balanceDueAtom,
  cartItemsAtom,
  paymentModeAtom,
  saleTypeAtom,
  submitErrorAtom,
  totalAmountAtom,
} from "~/atoms/new-sale";

export function SaleSummaryCard() {
  const cartItems = useAtomValue(cartItemsAtom);
  const totalAmount = useAtomValue(totalAmountAtom);
  const saleType = useAtomValue(saleTypeAtom);
  const paymentMode = useAtomValue(paymentModeAtom);
  const balanceDue = useAtomValue(balanceDueAtom);
  const submitError = useAtomValue(submitErrorAtom);
  const [amountPaid, setAmountPaid] = useAtom(amountPaidAtom);

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-orange-100">Total</span>
          <span className="text-2xl font-bold">S/ {totalAmount.toFixed(2)}</span>
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
              className="rounded-xl bg-white/20 border-white/30 text-white placeholder:text-white/50"
              placeholder="0.00"
            />
          </div>
        )}

        {saleType === "credito" && (
          <div className="flex items-center justify-between text-orange-100">
            <span>Saldo pendiente</span>
            <span>S/ {balanceDue.toFixed(2)}</span>
          </div>
        )}

        {submitError && (
          <p className="text-sm text-red-100 bg-red-500/20 rounded-lg px-3 py-2">{submitError}</p>
        )}
      </CardContent>
    </Card>
  );
}

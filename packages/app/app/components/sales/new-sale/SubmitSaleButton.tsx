import { useAtom, useAtomValue } from "jotai";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useCreateSale } from "~/hooks/use-sales";
import {
  amountPaidValueAtom,
  canSubmitAtom,
  cartItemsAtom,
  hasValidPartialAmountAtom,
  paymentModeAtom,
  requiresCustomerAtom,
  saleTypeAtom,
  selectedCustomerAtom,
  submitErrorAtom,
  totalAmountAtom,
  totalNetoKgAtom,
} from "~/atoms/new-sale";

export function SubmitSaleButton() {
  const navigate = useNavigate();
  const createSale = useCreateSale();

  const cartItems = useAtomValue(cartItemsAtom);
  const selectedCustomer = useAtomValue(selectedCustomerAtom);
  const paymentMode = useAtomValue(paymentModeAtom);
  const saleType = useAtomValue(saleTypeAtom);
  const totalAmount = useAtomValue(totalAmountAtom);
  const amountPaidValue = useAtomValue(amountPaidValueAtom);
  const totalNetoKg = useAtomValue(totalNetoKgAtom);
  const requiresCustomer = useAtomValue(requiresCustomerAtom);
  const hasValidPartialAmount = useAtomValue(hasValidPartialAmountAtom);
  const canSubmit = useAtomValue(canSubmitAtom);
  const [_, setSubmitError] = useAtom(submitErrorAtom);

  if (cartItems.length === 0) {
    return null;
  }

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      return;
    }

    if (requiresCustomer && !selectedCustomer) {
      setSubmitError("Para registrar credito necesitas seleccionar un cliente.");
      return;
    }

    if (paymentMode === "a_cuenta" && !hasValidPartialAmount) {
      setSubmitError("El monto a cuenta debe ser mayor a 0 y no superar el total.");
      return;
    }

    setSubmitError(null);

    try {
      const items = cartItems.map(({ unit, variantUnitQuantity, ...item }) => item);
      await createSale.mutateAsync({
        clientId: selectedCustomer?.id,
        saleType,
        totalAmount,
        amountPaid: amountPaidValue,
        netWeight: totalNetoKg || undefined,
        items,
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating sale:", error);
    }
  };

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 px-3 sm:px-4 py-4 bg-white border-t border-orange-100 z-40">
      <Button
        onClick={handleSubmit}
        disabled={createSale.isPending || !canSubmit}
        className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold"
      >
        <ShoppingCart className="h-5 w-5 mr-2" />
        {createSale.isPending ? "Guardando..." : "Completar Venta"}
      </Button>
    </div>
  );
}

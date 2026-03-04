import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useCreateSale } from "~/hooks/use-sales";
import {
  useSaleStore,
  getTotalAmount,
  getTotalNetoKg,
  getSaleType,
  getAmountPaidValue,
  getRequiresCustomer,
  getHasValidPartialAmount,
  getCanSubmit,
} from "~/stores/sale.store";

export function SubmitSaleButton() {
  const navigate = useNavigate();
  const createSale = useCreateSale();

  const cartItems = useSaleStore((state) => state.cartItems);
  const clearCart = useSaleStore((state) => state.clearCart);
  const selectedCustomer = useSaleStore((state) => state.selectedCustomer);
  const paymentMode = useSaleStore((state) => state.paymentMode);
  const amountPaid = useSaleStore((state) => state.amountPaid);
  const setSubmitError = useSaleStore((state) => state.setSubmitError);

  // Compute derived values
  const totalAmount = getTotalAmount(cartItems);
  const totalNetoKg = getTotalNetoKg(cartItems);
  const saleType = getSaleType(paymentMode);
  const amountPaidValue = getAmountPaidValue(paymentMode, totalAmount, amountPaid);
  const requiresCustomer = getRequiresCustomer(saleType);
  const hasValidPartialAmount = getHasValidPartialAmount(paymentMode, amountPaidValue, totalAmount);
  const canSubmit = getCanSubmit(cartItems.length, requiresCustomer, selectedCustomer, hasValidPartialAmount);

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

    if (!canSubmit) {
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
      clearCart();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating sale:", error);
      const message = error instanceof Error ? error.message : "Error al crear la venta. Intente nuevamente.";
      setSubmitError(message);
    }
  };

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 px-3 sm:px-4 py-4 bg-white border-t border-orange-100 z-40" data-testid="submit-sale-container">
      <Button
        onClick={handleSubmit}
        disabled={createSale.isPending}
        data-testid="submit-sale-button"
        className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold"
      >
        <ShoppingCart className="h-5 w-5 mr-2" />
        {createSale.isPending ? "Guardando..." : "Completar Venta"}
      </Button>
    </div>
  );
}

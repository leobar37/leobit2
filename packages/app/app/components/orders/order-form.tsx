import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { OrderCustomerField } from "./order-customer-field";
import { OrderDeliveryDate } from "./order-delivery-date";
import { OrderPaymentSelector } from "./order-payment-selector";
import { OrderItemsManager } from "./order-items-manager";
import { VariantSelector } from "@/components/sales/variant-selector";
import { useOrderFormContext } from "./order-form-context";
import { ToolbarActions } from "~/components/layout/toolbar-actions";

function OrderFormContent() {
  const orderForm = useOrderFormContext();

  return (
    <>
      <OrderCustomerField
        selectedCustomer={orderForm.selectedCustomer}
        onSelectCustomer={orderForm.setSelectedCustomer}
      />

      <OrderDeliveryDate
        value={orderForm.deliveryDate}
        onChange={orderForm.setDeliveryDate}
        minDate={orderForm.minDeliveryDate}
      />

      <OrderPaymentSelector
        value={orderForm.paymentIntent}
        onChange={orderForm.setPaymentIntent}
      />

      <OrderItemsManager />

      <Card className="border-0 shadow-md bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-orange-100">Total del pedido</span>
            <span className="text-2xl font-bold">S/ {orderForm.totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <VariantSelector
        open={orderForm.showVariantSelector}
        onOpenChange={orderForm.setShowVariantSelector}
        onSelect={orderForm.handleVariantSelect}
      />
    </>
  );
}

function OrderFormToolbar() {
  const navigate = useNavigate();
  const orderForm = useOrderFormContext();

  return (
    <ToolbarActions>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex-1 rounded-xl h-14"
          disabled={orderForm.isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={orderForm.handleSubmit}
          disabled={!orderForm.isValid || orderForm.isSubmitting}
          data-testid="save-order-button"
          className="flex-1 rounded-xl h-14 bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {orderForm.isSubmitting ? "Guardando..." : "Crear pedido"}
        </Button>
      </div>
    </ToolbarActions>
  );
}

export function OrderForm() {
  return (
    <>
      <div className="space-y-6 pb-4">
        <OrderFormContent />
      </div>
      <OrderFormToolbar />
    </>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderFormProvider } from "./order-form-context";
import { OrderCustomerField } from "./order-customer-field";
import { OrderDeliveryDate } from "./order-delivery-date";
import { OrderPaymentSelector } from "./order-payment-selector";
import { OrderItemsManager } from "./order-items-manager";
import { VariantSelector } from "@/components/sales/variant-selector";
import { useOrderFormContext } from "./order-form-context";
import { ToolbarActions } from "~/components/layout/toolbar-actions";

interface OrderFormProps {
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
  onCancel: () => void;
  isSubmitting?: boolean;
}

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

function OrderFormToolbar({ onCancel, isSubmitting }: { onCancel: () => void; isSubmitting?: boolean }) {
  const orderForm = useOrderFormContext();

  return (
    <ToolbarActions>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 rounded-xl h-14"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={orderForm.handleSubmit}
          disabled={!orderForm.isValid || isSubmitting}
          className="flex-1 rounded-xl h-14 bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {isSubmitting ? "Guardando..." : "Crear pedido"}
        </Button>
      </div>
    </ToolbarActions>
  );
}

export function OrderForm({ onSubmit, onCancel, isSubmitting }: OrderFormProps) {
  return (
    <OrderFormProvider onSubmit={onSubmit}>
      <div className="space-y-6 pb-4">
        <OrderFormContent />
      </div>
      <OrderFormToolbar onCancel={onCancel} isSubmitting={isSubmitting} />
    </OrderFormProvider>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrderForm } from "~/hooks/use-order-form";
import { OrderCustomerField } from "./order-customer-field";
import { OrderDeliveryDate } from "./order-delivery-date";
import { OrderPaymentSelector } from "./order-payment-selector";
import { OrderItemsManager } from "./order-items-manager";
import { VariantSelector } from "@/components/sales/variant-selector";

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

export function OrderForm({ onSubmit, onCancel, isSubmitting }: OrderFormProps) {
  const orderForm = useOrderForm({
    onSubmit,
  });

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <OrderCustomerField
        selectedCustomer={orderForm.selectedCustomer}
        onSelectCustomer={orderForm.setSelectedCustomer}
      />

      {/* Delivery Date */}
      <OrderDeliveryDate
        value={orderForm.deliveryDate}
        onChange={orderForm.setDeliveryDate}
        minDate={orderForm.minDeliveryDate}
      />

      {/* Payment Intent */}
      <OrderPaymentSelector
        value={orderForm.paymentIntent}
        onChange={orderForm.setPaymentIntent}
      />

      {/* Items Section */}
      <OrderItemsManager
        items={orderForm.items}
        showItemForm={orderForm.showItemForm}
        showVariantSelector={orderForm.showVariantSelector}
        selectedProduct={orderForm.selectedProduct}
        selectedVariant={orderForm.selectedVariant}
        calculator={orderForm.calculator}
        isKgProduct={orderForm.isKgProduct}
        onOpenVariantSelector={() => orderForm.setShowVariantSelector(true)}
        onCloseItemForm={() => orderForm.setShowItemForm(false)}
        onAddItem={orderForm.handleAddItem}
        onRemoveItem={orderForm.handleRemoveItem}
        onChangeProduct={orderForm.handleVariantSelect}
      />

      {/* Total */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-orange-100">Total del pedido</span>
            <span className="text-2xl font-bold">S/ {orderForm.totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 rounded-xl h-12"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={orderForm.handleSubmit}
          disabled={!orderForm.isValid || isSubmitting}
          className="flex-1 rounded-xl h-12"
        >
          {isSubmitting ? "Guardando..." : "Crear pedido"}
        </Button>
      </div>

      {/* Variant Selector Drawer */}
      <VariantSelector
        open={orderForm.showVariantSelector}
        onOpenChange={orderForm.setShowVariantSelector}
        onSelect={orderForm.handleVariantSelect}
      />
    </div>
  );
}

import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormInput, FormFieldShell, FormDate } from "@/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ClipboardList,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle,
  Info,
  Package,
} from "lucide-react";
import {
  useOrder,
  useOrderItems,
  useUpdateOrder,
  useConfirmOrder,
  useAddOrderItem,
  useRemoveOrderItem,
} from "~/hooks/use-orders";
import { CustomerSelect } from "~/components/customers/customer-select";
import { formatCurrency } from "~/lib/utils";
import { getToday } from "~/lib/date-utils";
import { useState, useEffect } from "react";
import type { Order, OrderItem } from "~/lib/db/schemas/order";

const orderFormSchema = z.object({
  clientId: z
    .string()
    .nullable()
    .refine((val) => val !== null && val !== "", {
      message: "El cliente es requerido",
    }),
  deliveryDate: z.string().min(1, "La fecha de entrega es requerida"),
  paymentIntent: z.enum(["contado", "credito"]),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  orderId: string;
  order?: Order;
  onSubmitSuccess?: () => void;
}

export function OrderForm({ orderId, order: orderProp, onSubmitSuccess }: OrderFormProps) {
  const { data: orders, isLoading: isLoadingOrderFromHook } = useOrder(orderId);
  const order = orderProp ?? orders?.[0];
  const isLoadingOrder = orderProp ? false : isLoadingOrderFromHook;
  const { data: orderItems = [], isLoading: isLoadingItems } =
    useOrderItems(orderId);

  const updateOrder = useUpdateOrder();
  const confirmOrder = useConfirmOrder();
  const addOrderItem = useAddOrderItem();
  const removeOrderItem = useRemoveOrderItem();

  const [showItemForm, setShowItemForm] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    console.log('[OrderForm] Mounted - orderId:', orderId, 'orderProp:', !!orderProp, 'order:', order?.id);
  }, [orderId, orderProp, order]);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    values: order
      ? {
          clientId: order.clientId ?? "",
          deliveryDate: order.deliveryDate,
          paymentIntent: order.paymentIntent,
        }
      : undefined,
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isDirty } } = form;

  const paymentIntent = watch("paymentIntent");

  // Determine if order is editable based on status
  const isEditable = order?.status === "draft";
  const isConfirmed = order?.status === "confirmed";
  const isDelivered = order?.status === "delivered";
  const isCancelled = order?.status === "cancelled";

  const onSubmit = async (data: OrderFormData) => {
    if (!order) return;

    await updateOrder.mutateAsync({
      id: orderId,
      changes: {
        clientId: data.clientId,
        deliveryDate: data.deliveryDate,
        paymentIntent: data.paymentIntent,
      },
    });
  };

  const handleConfirmOrder = async () => {
    if (!order) return;

    setIsConfirming(true);
    try {
      await confirmOrder.mutateAsync(orderId);
      onSubmitSuccess?.();
    } finally {
      setIsConfirming(false);
    }
  };

  const isLoading = isLoadingOrder || isLoadingItems;
  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.orderedQuantity * item.unitPriceQuoted,
    0
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="border-0 shadow-lg rounded-3xl">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <Info className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          No se encontró el pedido.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Order Info Card */}
      <Card className="border-0 shadow-lg rounded-3xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-600" />
            Información del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Controller
              name="clientId"
              control={control}
              render={({ field, fieldState }) => (
                <FormFieldShell
                  label="Cliente *"
                  error={fieldState.error?.message}
                >
                  <CustomerSelect
                    value={field.value || null}
                    onChange={(customer) => field.onChange(customer?.id || "")}
                    disabled={!isEditable}
                    required
                  />
                </FormFieldShell>
              )}
            />
          </div>

          {/* Delivery Date */}
          <FormDate
            name="deliveryDate"
            label="Fecha de Entrega"
            required
            disabled={!isEditable}
            minDate={getToday()}
          />

          {/* Payment Intent */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Forma de Pago *
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentIntent === "contado" ? "default" : "outline"}
                disabled={!isEditable}
                className={`flex-1 rounded-xl ${
                  paymentIntent === "contado"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : ""
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={() =>
                  setValue("paymentIntent", "contado", { shouldDirty: true })
                }
              >
                Contado
              </Button>
              <Button
                type="button"
                variant={paymentIntent === "credito" ? "default" : "outline"}
                disabled={!isEditable}
                className={`flex-1 rounded-xl ${
                  paymentIntent === "credito"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : ""
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={() =>
                  setValue("paymentIntent", "credito", { shouldDirty: true })
                }
              >
                Crédito
              </Button>
            </div>
          </div>

          {/* Save Button - only show if editable and dirty */}
          {isEditable && isDirty && (
            <Button
              type="submit"
              disabled={updateOrder.isPending}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
            >
              {updateOrder.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Order Items Card */}
      <Card className="border-0 shadow-lg rounded-3xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderItems.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No hay productos en el pedido</p>
              {isEditable && (
                <p className="text-sm">
                  Agrega productos usando el botón de abajo
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {orderItems.map((item) => (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  onRemove={() =>
                    removeOrderItem.mutate({
                      orderId: orderId,
                      itemId: item.id,
                      itemTotal: item.orderedQuantity * item.unitPriceQuoted,
                      currentTotal: totalAmount,
                    })
                  }
                  isRemoving={removeOrderItem.isPending}
                  canRemove={isEditable}
                />
              ))}
            </div>
          )}

          {/* Total */}
          {orderItems.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-orange-600">
                  S/ {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Add Item Button - only show if editable */}
          {isEditable && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-dashed border-2"
              onClick={() => setShowItemForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Confirm Order Button - only show if editable and has items */}
      {isEditable && orderItems.length > 0 && (
        <Button
          onClick={handleConfirmOrder}
          disabled={isConfirming || updateOrder.isPending}
          className="w-full rounded-xl bg-green-600 hover:bg-green-700 h-12"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {isConfirming ? "Confirmando..." : "Confirmar Pedido"}
        </Button>
      )}

      {/* Status message for non-editable orders */}
      {!isEditable && (
        <Alert
          className={`${
            isDelivered
              ? "bg-green-50 border-green-200"
              : isCancelled
                ? "bg-red-50 border-red-200"
                : "bg-blue-50 border-blue-200"
          }`}
        >
          <Info
            className={`h-4 w-4 ${
              isDelivered
                ? "text-green-600"
                : isCancelled
                  ? "text-red-600"
                  : "text-blue-600"
            }`}
          />
          <AlertDescription
            className={
              isDelivered
                ? "text-green-800"
                : isCancelled
                  ? "text-red-800"
                  : "text-blue-800"
            }
          >
            {isDelivered
              ? "Este pedido ha sido entregado y no puede ser modificado."
              : isCancelled
                ? "Este pedido ha sido cancelado y no puede ser modificado."
                : "Este pedido está confirmado y no puede ser modificado."}
          </AlertDescription>
        </Alert>
      )}

      {/* Item Form Modal - Simplified placeholder */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Agregar Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Usa la calculadora para agregar productos al pedido.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowItemForm(false)}
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </form>
    </FormProvider>
  );
}

// Sub-component for order item row
interface OrderItemRowProps {
  item: OrderItem;
  onRemove: () => void;
  isRemoving: boolean;
  canRemove: boolean;
}

function OrderItemRow({
  item,
  onRemove,
  isRemoving,
  canRemove,
}: OrderItemRowProps) {
  const subtotal = item.orderedQuantity * item.unitPriceQuoted;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {item.productName}
          {item.variantName && (
            <span className="text-muted-foreground"> - {item.variantName}</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.orderedQuantity} x S/ {formatCurrency(item.unitPriceQuoted)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-orange-600">
          S/ {formatCurrency(subtotal)}
        </span>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={onRemove}
            disabled={isRemoving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

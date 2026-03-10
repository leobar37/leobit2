import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ClipboardList, 
  Calendar, 
  User, 
  CreditCard, 
  Plus, 
  Trash2, 
  CheckCircle,
  Info,
  Package
} from "lucide-react";
import { useOrder, useOrderItems, useUpdateOrder, useConfirmOrder, useAddOrderItem, useRemoveOrderItem } from "~/hooks/use-orders";
import { useCustomers } from "~/hooks/use-customers";
import { formatCurrency } from "~/lib/utils";
import { useState } from "react";
import type { OrderItem } from "~/lib/db/schemas/order";

const draftOrderSchema = z.object({
  clientId: z.string().nullable().refine(val => val !== null && val !== "", {
    message: "El cliente es requerido",
  }),
  deliveryDate: z.string().min(1, "La fecha de entrega es requerida"),
  paymentIntent: z.enum(["contado", "credito"]),
});

type DraftOrderFormData = z.infer<typeof draftOrderSchema>;

interface DraftOrderFormProps {
  draftId: string;
  onSubmitSuccess?: () => void;
}

export function DraftOrderForm({ draftId, onSubmitSuccess }: DraftOrderFormProps) {
  const { data: orders, isLoading: isLoadingOrder } = useOrder(draftId);
  const order = orders?.[0];
  const { data: orderItems = [], isLoading: isLoadingItems } = useOrderItems(draftId);
  const { data: customers = [] } = useCustomers();
  
  const updateOrder = useUpdateOrder();
  const confirmOrder = useConfirmOrder();
  const addOrderItem = useAddOrderItem();
  const removeOrderItem = useRemoveOrderItem();
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<DraftOrderFormData>({
    resolver: zodResolver(draftOrderSchema),
    values: order ? {
      clientId: order.clientId ?? "",
      deliveryDate: order.deliveryDate,
      paymentIntent: order.paymentIntent,
    } : undefined,
  });

  const paymentIntent = watch("paymentIntent");

  const onSubmit = async (data: DraftOrderFormData) => {
    if (!order) return;
    
    await updateOrder.mutateAsync({
      id: draftId,
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
      await confirmOrder.mutateAsync(draftId);
      onSubmitSuccess?.();
    } finally {
      setIsConfirming(false);
    }
  };

  const isLoading = isLoadingOrder || isLoadingItems;
  const totalAmount = orderItems.reduce((sum, item) => sum + (item.orderedQuantity * item.unitPriceQuoted), 0);

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
          No se encontró el borrador del pedido.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
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
            <Label htmlFor="clientId" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente *
            </Label>
            <select
              id="clientId"
              {...register("clientId")}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Seleccionar cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId.message}</p>
            )}
          </div>

          {/* Delivery Date */}
          <div className="space-y-2">
            <Label htmlFor="deliveryDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha de Entrega *
            </Label>
            <Input
              id="deliveryDate"
              type="date"
              {...register("deliveryDate")}
              className="rounded-xl"
            />
            {errors.deliveryDate && (
              <p className="text-sm text-red-500">{errors.deliveryDate.message}</p>
            )}
          </div>

          {/* Payment Intent */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Forma de Pago *
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentIntent === "contado" ? "default" : "outline"}
                className={`flex-1 rounded-xl ${paymentIntent === "contado" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                onClick={() => setValue("paymentIntent", "contado", { shouldDirty: true })}
              >
                Contado
              </Button>
              <Button
                type="button"
                variant={paymentIntent === "credito" ? "default" : "outline"}
                className={`flex-1 rounded-xl ${paymentIntent === "credito" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                onClick={() => setValue("paymentIntent", "credito", { shouldDirty: true })}
              >
                Crédito
              </Button>
            </div>
          </div>

          {/* Save Button */}
          {isDirty && (
            <Button
              onClick={handleSubmit(onSubmit)}
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
              <p className="text-sm">Agrega productos usando el botón de abajo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderItems.map((item) => (
                <OrderItemRow 
                  key={item.id} 
                  item={item} 
                  onRemove={() => removeOrderItem.mutate({ orderId: draftId, itemId: item.id })}
                  isRemoving={removeOrderItem.isPending}
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

          {/* Add Item Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-dashed border-2"
            onClick={() => setShowItemForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Producto
          </Button>
        </CardContent>
      </Card>

      {/* Confirm Order Button */}
      {orderItems.length > 0 && (
        <Button
          onClick={handleConfirmOrder}
          disabled={isConfirming || updateOrder.isPending}
          className="w-full rounded-xl bg-green-600 hover:bg-green-700 h-12"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {isConfirming ? "Confirmando..." : "Confirmar Pedido"}
        </Button>
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
    </div>
  );
}

// Sub-component for order item row
interface OrderItemRowProps {
  item: OrderItem;
  onRemove: () => void;
  isRemoving: boolean;
}

function OrderItemRow({ item, onRemove, isRemoving }: OrderItemRowProps) {
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
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={onRemove}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

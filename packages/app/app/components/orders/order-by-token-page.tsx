import { useState } from "react";
import { Store, Loader2, AlertCircle, CheckCircle2, Package, Trash2, Plus, ShoppingCart, Calendar, Phone, User, FileText } from "lucide-react";

import {
  usePublicOrder,
  useAddOrderItem,
  useDeleteOrderItem,
  useConfirmPublicOrder,
  type ConfirmOrderInput,
} from "~/hooks/use-public-order";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatWeight } from "~/lib/utils";

interface OrderByTokenPageProps {
  token: string;
}

type ViewState = "loading" | "invalid" | "valid" | "submitted";

export function OrderByTokenPage({ token }: OrderByTokenPageProps) {
  const { data: order, isLoading, error } = usePublicOrder(token);
  const addItem = useAddOrderItem(token);
  const deleteItem = useDeleteOrderItem(token);
  const confirmOrder = useConfirmPublicOrder(token);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const getViewState = (): ViewState => {
    if (isLoading) return "loading";
    if (error || !order) return "invalid";
    if (confirmOrder.isSuccess) return "submitted";
    return "valid";
  };

  const viewState = getViewState();

  const isEditable = order?.status === "draft" && !confirmOrder.isSuccess;

  const handleDeleteItem = async (itemId: string) => {
    if (!order || !isEditable) return;
    try {
      await deleteItem.mutateAsync({ itemId, baseVersion: order.version });
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const handleConfirmOrder = async () => {
    if (!order || !isEditable) return;

    const input: ConfirmOrderInput = {
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      deliveryDate: deliveryDate || undefined,
      notes: notes || undefined,
    };

    try {
      await confirmOrder.mutateAsync(input);
    } catch (err) {
      console.error("Error confirming order:", err);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <Card className="w-full max-w-md border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
            <p className="mt-4 text-muted-foreground">Cargando pedido...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <Card className="w-full max-w-md border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-xl mb-2">Token inválido</CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Este pedido no existe o el enlace ha expirado"}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewState === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <Card className="w-full max-w-md border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl mb-2">¡Pedido confirmado!</CardTitle>
            <CardDescription>
              Tu pedido ha sido recibido y está siendo procesado.
            </CardDescription>
            <div className="mt-6 p-4 bg-muted rounded-2xl">
              <p className="text-sm text-muted-foreground">
                Número de pedido: <strong>{order?.id.slice(-8).toUpperCase()}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = parseFloat(order?.totalAmount || "0");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="bg-white/80 backdrop-blur-xl border-b border-orange-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Tu Pedido</h1>
            <p className="text-sm text-muted-foreground">
              {isEditable ? "Puedes editar tu pedido" : "Pedido confirmado"}
            </p>
          </div>
          <Badge
            variant={order?.status === "draft" ? "secondary" : "default"}
            className={
              order?.status === "draft"
                ? "bg-orange-100 text-orange-700 hover:bg-orange-100"
                : "bg-green-100 text-green-700 hover:bg-green-100"
            }
          >
            {order?.status === "draft" ? "Borrador" : order?.status}
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-32">
        <Card className="border-0 shadow-lg rounded-2xl mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                Fecha de entrega: {order?.deliveryDate || "Por definir"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Método de pago</span>
              <Badge variant="outline">
                {order?.paymentIntent === "contado" ? "Contado" : "Crédito"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order?.items && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variantName} · {formatWeight(parseFloat(item.orderedQuantity))} und
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        S/ {formatCurrency(parseFloat(item.orderedQuantity) * parseFloat(item.unitPriceQuoted))}
                      </span>
                      {isEditable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteItem.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No hay productos en el pedido</p>
              </div>
            )}

            {isEditable && (
              <Button
                variant="outline"
                className="w-full mt-4 rounded-xl"
                disabled
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar producto
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-2xl mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-orange-600">
                S/ {formatCurrency(totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info Form */}
        {isEditable && (
          <Card className="border-0 shadow-lg rounded-2xl mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" />
                Datos del cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="999 999 999"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de entrega deseada
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notas adicionales
                </Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguna instrucción especial..."
                  className="rounded-xl"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer - Confirm Button */}
      {isEditable && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-orange-100 p-4">
          <div className="max-w-2xl mx-auto">
            <Button
              className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-lg font-semibold shadow-lg"
              onClick={handleConfirmOrder}
              disabled={
                confirmOrder.isPending ||
                !order?.items?.length
              }
            >
              {confirmOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Confirmar Pedido
                </>
              )}
            </Button>
            {confirmOrder.error && (
              <p className="text-sm text-red-500 text-center mt-2">
                {confirmOrder.error instanceof Error
                  ? confirmOrder.error.message
                  : "Error al confirmar el pedido"}
              </p>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

export default OrderByTokenPage;

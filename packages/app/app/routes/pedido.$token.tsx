import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import {
  usePublicOrder,
  useAddItemToPublicOrder,
  useDeleteItemFromPublicOrder,
  useConfirmPublicOrder,
  useUpdateItemQuantity,
  useCancelPublicOrder,
  type PublicOrder,
} from "~/hooks/use-public-order";
import { useToastError } from "~/hooks/use-toast-error";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Package,
  Calendar,
  CreditCard,
  ClipboardList,
  CheckCircle,
  XCircle,
  Truck,
  Store,
  Plus,
  Trash2,
  ChevronRight,
  Minus,
  ShoppingBag,
  User,
  Phone,
  FileText,
  PhoneCall,
} from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  draft: {
    label: "Borrador",
    color: "bg-gray-100 text-gray-700",
    icon: ClipboardList,
    description: "Puedes modificar tu pedido",
  },
  confirmed: {
    label: "Confirmado",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
    description: "Tu pedido está confirmado",
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
    description: "Este pedido fue cancelado",
  },
  delivered: {
    label: "Entregado",
    color: "bg-green-100 text-green-700",
    icon: Truck,
    description: "Pedido entregado",
  },
};

export default function PublicOrderPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<string>("1");

  // Confirmation form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: order, isLoading, error } = usePublicOrder(token);
  const addItem = useAddItemToPublicOrder();
  const deleteItem = useDeleteItemFromPublicOrder();
  const confirmOrder = useConfirmPublicOrder();
  const updateItem = useUpdateItemQuantity();
  const cancelOrder = useCancelPublicOrder();
  const { showError, showSuccess } = useToastError();

  const { data: products } = useProducts();
  const { data: variants } = useVariantsByProduct(selectedProductId || "", {
    isActive: true,
  });

  const canEdit = order?.status === "draft";

  const handleAddItem = async (variantId: string, productId: string) => {
    if (!token || !quantity) return;

    try {
      await addItem.mutateAsync({
        token,
        item: {
          productId,
          variantId,
          quantity: parseFloat(quantity),
        },
      });
      showSuccess("Producto agregado");
      setSelectedProductId(null);
      setQuantity("1");
      setShowProductSelector(false);
    } catch (err) {
      showError("Error al agregar producto", err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!token || !order) return;

    try {
      await deleteItem.mutateAsync({
        token,
        itemId,
        baseVersion: order.version,
      });
      showSuccess("Item eliminado");
    } catch (err) {
      showError("Error al eliminar item", err);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (!token || !order) return;
    if (newQuantity < 0.1) return;

    try {
      await updateItem.mutateAsync({
        token,
        itemId,
        input: {
          quantity: newQuantity,
          baseVersion: order.version,
        },
      });
    } catch (err) {
      showError("Error al actualizar cantidad", err);
    }
  };

  const handleCancelOrder = async () => {
    if (!token) return;

    try {
      await cancelOrder.mutateAsync({ token });
      showSuccess("Pedido cancelado exitosamente");
    } catch (err) {
      showError("Error al cancelar pedido", err);
    }
  };

  const handleConfirm = async () => {
    if (!token) return;

    try {
      await confirmOrder.mutateAsync({
        token,
        input: {
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          deliveryDate: deliveryDate || undefined,
          notes: notes || undefined,
        },
      });
      showSuccess("Pedido confirmado exitosamente");
      setShowConfirmDialog(false);
    } catch (err) {
      showError("Error al confirmar pedido", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-semibold mb-2">Pedido no encontrado</h1>
            <p className="text-muted-foreground mb-4">
              El enlace puede haber expirado o ser inválido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-orange-500" />
            <span className="font-semibold">Avileo</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status Card */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pedido</p>
                  <p className="font-semibold">#{order.id.slice(-8)}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={status.color} variant="secondary">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {status.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de entrega</p>
                <p className="font-semibold">
                  {format(new Date(order.deliveryDate), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </div>

            <div className="border-t" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forma de pago</p>
                <p className="font-semibold">
                  {order.paymentIntent === "contado" ? "Contado" : "Crédito"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items del pedido
            </CardTitle>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setShowProductSelector(true)}
                className="rounded-full bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {order.items?.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tu pedido está vacío
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Agrega productos para comenzar tu pedido
                </p>
                {canEdit && (
                  <Button
                    onClick={() => setShowProductSelector(true)}
                    className="rounded-full bg-orange-500 hover:bg-orange-600 px-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar productos
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.variantName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {canEdit ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.id,
                                  parseFloat(item.orderedQuantity) - 0.5
                                )
                              }
                              disabled={updateItem.isPending || parseFloat(item.orderedQuantity) <= 0.1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium">
                              {item.orderedQuantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.id,
                                  parseFloat(item.orderedQuantity) + 0.5
                                )
                              }
                              disabled={updateItem.isPending}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {item.orderedQuantity} unidades
                          </span>
                        )}
                        <div className="text-right min-w-[80px]">
                          <p className="font-semibold">
                            S/{" "}
                            {formatCurrency(
                              parseFloat(item.orderedQuantity) *
                                parseFloat(item.unitPriceQuoted)
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            S/ {formatCurrency(item.unitPriceQuoted)} c/u
                          </p>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deleteItem.isPending}
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t my-4" />

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold">
                    S/ {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Confirm Button */}
        {canEdit && order.items && order.items.length > 0 && (
          <Button
            onClick={() => setShowConfirmDialog(true)}
            className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Confirmar Pedido
          </Button>
        )}

        {/* Cancel Button (only for draft) */}
        {canEdit && (
          <Button
            variant="outline"
            onClick={handleCancelOrder}
            disabled={cancelOrder.isPending}
            className="w-full h-12 rounded-xl border-red-300 text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-5 w-5 mr-2" />
            Cancelar Pedido
          </Button>
        )}

        {/* Final States */}
        {order.status === "confirmed" && (
          <div className="bg-blue-50 p-6 rounded-xl text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-900 text-lg mb-2">
              Tu pedido está confirmado
            </h3>
            <p className="text-sm text-blue-700">
              El vendedor se contactará contigo para coordinar la entrega
            </p>
          </div>
        )}

        {order.status === "cancelled" && (
          <div className="bg-red-50 p-6 rounded-xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="font-semibold text-red-900 text-lg mb-2">
              Este pedido fue cancelado
            </h3>
            <p className="text-sm text-red-700 mb-4">
              Si tienes alguna consulta, comunícate con el vendedor
            </p>
            <div className="flex items-center justify-center gap-2 text-red-800">
              <PhoneCall className="h-4 w-4" />
              <span className="text-sm font-medium">Contactar al vendedor</span>
            </div>
          </div>
        )}

        {order.status === "delivered" && (
          <div className="bg-green-50 p-6 rounded-xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-900 text-lg mb-2">
              Pedido entregado
            </h3>
            <p className="text-sm text-green-700">
              ¡Gracias por tu compra! Esperamos verte pronto.
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>¿Tienes preguntas? Comunícate con el vendedor.</p>
        </div>
      </main>

      {/* Product Selector Sheet */}
      <Sheet open={showProductSelector} onOpenChange={setShowProductSelector}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Agregar producto</SheetTitle>
          </SheetHeader>

          {!selectedProductId ? (
            <div className="space-y-3 overflow-y-auto h-[calc(85vh-100px)]">
              <p className="text-sm text-muted-foreground mb-3">
                Selecciona un producto:
              </p>
              {products?.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {product.type} · S/ {formatCurrency(product.basePrice)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedProductId(null)}
                className="text-sm text-orange-600 flex items-center gap-1"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Volver a productos
              </button>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Selecciona una variante:
                </p>
                {variants?.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center gap-3 p-4 rounded-xl border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{variant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {variant.unitQuantity} unidades · S/{" "}
                        {formatCurrency(variant.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-20 text-center"
                      />
                      <Button
                        onClick={() =>
                          handleAddItem(variant.id, selectedProductId)
                        }
                        disabled={addItem.isPending}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar tu pedido</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Tu nombre
              </Label>
              <Input
                id="name"
                placeholder="Ingresa tu nombre"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                placeholder="Ingresa tu teléfono"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de entrega deseada
              </Label>
              <Input
                id="delivery"
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
                placeholder="Alguna indicación especial..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="bg-orange-50 p-4 rounded-xl">
              <p className="text-sm text-orange-800">
                <strong>Total a pagar:</strong> S/{" "}
                {formatCurrency(order.totalAmount)}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2">
            <Button
              onClick={handleConfirm}
              disabled={confirmOrder.isPending}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
            >
              {confirmOrder.isPending ? (
                "Confirmando..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Pedido
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="w-full rounded-xl"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

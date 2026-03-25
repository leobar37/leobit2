/**
 * Public Sale Page
 * Allows customers to view and edit sales via token
 * Similar to pedido.$token.tsx but for the unified sales system
 */
import { useParams } from "react-router";
import { useState } from "react";
import {
  usePublicSale,
  useAddItemToPublicSale,
  useUpdatePublicSaleItem,
  useDeletePublicSaleItem,
  useCancelPublicSale,
  useConfirmPublicSale,
  usePublicCatalog,
  usePublicVariants,
} from "~/hooks/use-public-sale";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
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
  ClipboardList,
  CheckCircle,
  XCircle,
  Truck,
  Plus,
  Trash2,
  Minus,
  ShoppingBag,
  AlertCircle,
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
  active: {
    label: "Activo",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
    description: "Venta activa",
  },
  delivered: {
    label: "Entregado",
    color: "bg-green-100 text-green-700",
    icon: Truck,
    description: "Pedido entregado",
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
    description: "Este pedido fue cancelado",
  },
};

export default function PublicSalePage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<string>("1");

  // Confirmation form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: sale, isLoading, error } = usePublicSale(token);
  const addItem = useAddItemToPublicSale();
  const updateItem = useUpdatePublicSaleItem();
  const deleteItem = useDeletePublicSaleItem();
  const cancelSale = useCancelPublicSale();
  const confirmSale = useConfirmPublicSale();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const { data: products } = usePublicCatalog(token);
  const { data: variants } = usePublicVariants(token, selectedProductId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enlace no válido</h2>
            <p className="text-gray-500">
              Este enlace ha expirado o no existe. Por favor contacta a tu vendedor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[sale.status];
  const StatusIcon = status.icon;

  const canEdit = sale.status === "draft" && sale.allowCustomerEdit;

  const handleAddItem = (variantId: string) => {
    if (!token) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Cantidad inválida", {
        description: "Ingresa una cantidad válida",
      });
      return;
    }

    const variant = variants?.find((v) => v.id === variantId);
    if (!variant) return;

    addItem.mutate({
      token,
      productId: variant.productId,
      variantId,
      quantity: qty,
    });

    setShowProductSelector(false);
    setSelectedProductId(null);
    setQuantity("1");
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (!token || newQuantity < 0) return;
    updateItem.mutate({
      token,
      itemId,
      quantity: newQuantity,
      baseVersion: sale.version,
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!token) return;
    const confirmed = await confirm({
      title: "Eliminar producto",
      description: "¿Eliminar este producto?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      deleteItem.mutate({ token, itemId, baseVersion: sale.version });
    }
  };

  const handleCancel = async () => {
    if (!token) return;
    const confirmed = await confirm({
      title: "Cancelar pedido",
      description: "¿Cancelar este pedido? Esta acción no se puede deshacer.",
      confirmText: "Cancelar pedido",
      cancelText: "Volver",
      variant: "destructive",
    });

    if (confirmed) {
      cancelSale.mutate({ token });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.color}`}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold">Tu Pedido</h1>
              <p className={`text-sm ${status.color} inline-block px-2 py-0.5 rounded-full`}>
                {status.label}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{status.description}</p>

          {!sale.allowCustomerEdit && sale.status === "draft" && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                La edición ha sido deshabilitada por el vendedor.
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Delivery Info (for pre_orders) */}
        {sale.type === "pre_order" && sale.deliveryDate && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  Fecha de entrega:{" "}
                  {format(new Date(sale.deliveryDate), "EEEE d 'de' MMMM", {
                    locale: es,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sale.items.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No hay productos aún</p>
            ) : (
              sale.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-gray-500">{item.variantName}</p>
                    <p className="text-sm font-medium text-orange-600">
                      S/ {formatCurrency(parseFloat(item.subtotal))}
                    </p>
                  </div>

                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const qty = parseFloat(
                            item.orderedQuantity || item.quantity || "0"
                          );
                          handleUpdateQuantity(item.id, Math.max(0, qty - 1));
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center">
                        {item.orderedQuantity || item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const qty = parseFloat(
                            item.orderedQuantity || item.quantity || "0"
                          );
                          handleUpdateQuantity(item.id, qty + 1);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">
                      Cantidad: {item.orderedQuantity || item.quantity}
                    </span>
                  )}
                </div>
              ))
            )}

            {canEdit && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowProductSelector(true)}
              >
                <Plus className="h-4 w-4" />
                Agregar producto
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Total */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total</span>
              <span className="text-2xl font-bold text-orange-600">
                S/ {formatCurrency(parseFloat(sale.totalAmount))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 text-red-600"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={() => setShowConfirmDialog(true)}
              disabled={sale.items.length === 0}
            >
              Confirmar pedido
            </Button>
          </div>
        )}
      </main>

      {/* Product Selector Sheet */}
      <Sheet open={showProductSelector} onOpenChange={setShowProductSelector}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Agregar producto</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            {!selectedProductId ? (
              <div className="grid gap-2">
                {products?.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <div className="text-left">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">Seleccionar variante →</p>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedProductId(null)}
                  className="text-sm"
                >
                  ← Volver a productos
                </Button>
                <div className="grid gap-2">
                  {variants?.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        <p className="text-sm text-orange-600">
                          S/ {formatCurrency(parseFloat(variant.price))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-20"
                          min="0.1"
                          step="0.1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddItem(variant.id)}
                          disabled={addItem.isPending}
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="999 999 999"
              />
            </div>
            {sale.type === "pre_order" && (
              <div className="space-y-2">
                <Label htmlFor="delivery">Fecha de entrega deseada *</Label>
                <Input
                  id="delivery"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alguna indicación especial..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                !customerName ||
                !customerPhone ||
                (sale.type === "pre_order" && !deliveryDate) ||
                confirmSale.isPending
              }
              onClick={() => {
                if (!token) return;
                confirmSale.mutate(
                  {
                    token,
                    customerName,
                    customerPhone,
                    deliveryDate,
                    notes,
                  },
                  {
                    onSuccess: () => {
                      setShowConfirmDialog(false);
                    },
                  }
                );
              }}
            >
              {confirmSale.isPending ? "Confirmando..." : "Confirmar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}

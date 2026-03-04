import { useState, useEffect, useMemo } from "react";
import { Package, Truck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Order, OrderItem } from "~/lib/db/schema";

interface DeliveredItem {
  itemId: string;
  deliveredQuantity: number;
  unitPriceFinal?: number;
}

interface OrderDeliveryModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deliveredItems: DeliveredItem[]) => void;
  isSubmitting?: boolean;
}

interface ItemFormData {
  itemId: string;
  productName: string;
  variantName: string;
  orderedQuantity: number;
  unitPriceQuoted: number;
  deliveredQuantity: number;
  unitPriceFinal: number;
}

export function OrderDeliveryModal({
  order,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: OrderDeliveryModalProps) {
  const [items, setItems] = useState<ItemFormData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (!isOpen || !order?.items) {
      setItems([]);
      setError(null);
      return;
    }

    const initialItems = order.items.map((item: OrderItem) => ({
      itemId: item.id,
      productName: item.productName,
      variantName: item.variantName,
      orderedQuantity: Number(item.orderedQuantity),
      unitPriceQuoted: Number(item.unitPriceQuoted),
      deliveredQuantity: Number(item.orderedQuantity),
      unitPriceFinal: Number(item.unitPriceQuoted),
    }));

    setItems(initialItems);
    setError(null);
  }, [isOpen, order]);

  // Calculate totals
  const { itemTotals, grandTotal } = useMemo(() => {
    const itemTotals = items.map((item) => ({
      itemId: item.itemId,
      subtotal: item.deliveredQuantity * item.unitPriceFinal,
    }));

    const grandTotal = itemTotals.reduce((sum, item) => sum + item.subtotal, 0);

    return { itemTotals, grandTotal };
  }, [items]);

  // Check if form is valid
  const isValid = useMemo(() => {
    const hasAtLeastOneItem = items.some((item) => item.deliveredQuantity > 0);
    const allQuantitiesValid = items.every(
      (item) =>
        item.deliveredQuantity >= 0 &&
        item.deliveredQuantity <= item.orderedQuantity
    );
    const allPricesValid = items.every((item) => item.unitPriceFinal >= 0);

    return hasAtLeastOneItem && allQuantitiesValid && allPricesValid;
  }, [items]);

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;
        // Clamp quantity between 0 and orderedQuantity
        const clampedQuantity = Math.min(
          Math.max(0, quantity),
          item.orderedQuantity
        );
        return { ...item, deliveredQuantity: clampedQuantity };
      })
    );
    setError(null);
  };

  const updateItemPrice = (itemId: string, price: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, unitPriceFinal: Math.max(0, price) } : item
      )
    );
    setError(null);
  };

  const handleConfirm = () => {
    if (!isValid) {
      setError("Debe entregar al menos un item y todas las cantidades deben ser válidas");
      return;
    }

    const deliveredItems: DeliveredItem[] = items.map((item) => ({
      itemId: item.itemId,
      deliveredQuantity: item.deliveredQuantity,
      unitPriceFinal:
        item.unitPriceFinal !== item.unitPriceQuoted ? item.unitPriceFinal : undefined,
    }));

    onConfirm(deliveredItems);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="h-4 w-4 text-orange-600" />
            </div>
            Entregar pedido
          </DialogTitle>
          <DialogDescription>
            Ajusta las cantidades y precios finales antes de crear la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Items List */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const subtotal = itemTotals.find((t) => t.itemId === item.itemId)?.subtotal || 0;

              return (
                <div
                  key={item.itemId}
                  className="border rounded-xl p-4 space-y-3 bg-muted/30"
                >
                  {/* Product Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      <p className="text-xs text-muted-foreground">
                        Pedido: {item.orderedQuantity} un · Precio: S/{" "}
                        {item.unitPriceQuoted.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Cantidad entregada</Label>
                      <Input
                        type="number"
                        min="0"
                        max={item.orderedQuantity}
                        step="0.001"
                        value={item.deliveredQuantity || ""}
                        onChange={(e) =>
                          updateItemQuantity(item.itemId, parseFloat(e.target.value) || 0)
                        }
                        className="rounded-xl h-10"
                        disabled={isSubmitting}
                      />

                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Precio final (S/)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPriceFinal || ""}
                        onChange={(e) =>
                          updateItemPrice(item.itemId, parseFloat(e.target.value) || 0)
                        }
                        className="rounded-xl h-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">S/ {subtotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Total */}
          <div className="flex items-center justify-between py-3 px-4 bg-orange-100 rounded-xl">
            <span className="font-medium">Total de la venta</span>
            <span className="text-xl font-bold">S/ {grandTotal.toFixed(2)}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-xl h-12"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!isValid || isSubmitting}
              className="flex-1 rounded-xl h-12 bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? "Procesando..." : "Confirmar entrega"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

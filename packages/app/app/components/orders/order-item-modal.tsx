import { useState, useEffect } from "react";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrderItem } from "~/lib/db/schema";

interface OrderItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: OrderItem | null;
  onSave: (newQuantity: number) => void;
  isSubmitting?: boolean;
}

export function OrderItemModal({
  isOpen,
  onClose,
  item,
  onSave,
  isSubmitting,
}: OrderItemModalProps) {
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    if (item) {
      setQuantity(Number(item.orderedQuantity));
    } else {
      setQuantity(0);
    }
  }, [item, isOpen]);

  const handleSave = () => {
    if (quantity > 0) {
      onSave(quantity);
      onClose();
    }
  };

  const unitPrice = item ? Number(item.unitPriceQuoted) : 0;
  const subtotal = quantity * unitPrice;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="order-item-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-orange-600" />
            </div>
            Modificar item
          </DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-xl p-4" data-testid="order-item-info">
              <p className="font-semibold" data-testid="order-item-modal-product-name">{item.productName}</p>
              <p className="text-sm text-muted-foreground" data-testid="order-item-modal-variant-name">{item.variantName}</p>
              <p className="text-sm text-muted-foreground mt-1" data-testid="order-item-modal-price">
                Precio: S/ {Number(item.unitPriceQuoted).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Nueva cantidad</Label>
              <NumericInput
                id="quantity"
                min="0.001"
                decimals={3}
                value={quantity || ""}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="rounded-xl"
                autoFocus
                data-testid="order-item-quantity-input"
              />
            </div>

            <div className="flex items-center justify-between py-2 px-4 bg-orange-50 rounded-xl">
              <span className="text-sm text-muted-foreground">Nuevo subtotal</span>
              <span className="font-semibold text-lg" data-testid="order-item-new-subtotal">S/ {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-xl"
                disabled={isSubmitting}
                data-testid="order-item-cancel-button"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={quantity <= 0 || isSubmitting}
                className="flex-1 rounded-xl"
                data-testid="order-item-save-button"
              >
                {isSubmitting ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

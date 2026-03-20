import { useState } from "react";
import { X } from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PurchaseItemEditModalProps {
  item?: {
    productName: string;
    variantName: string;
    quantity: string;
    unitCost: string;
    totalCost: string;
  };
  isNew?: boolean;
  onSave: (updates: {
    quantity: number;
    unitCost: number;
    productId?: string;
    variantId?: string;
    productName?: string;
    variantName?: string;
  }) => void;
  onClose: () => void;
}

export function PurchaseItemEditModal({
  item,
  isNew = false,
  onSave,
  onClose,
}: PurchaseItemEditModalProps) {
  const [quantity, setQuantity] = useState(item?.quantity || "0");
  const [unitCost, setUnitCost] = useState(item?.unitCost || "0");

  const qty = parseFloat(quantity) || 0;
  const cost = parseFloat(unitCost) || 0;
  const total = qty * cost;

  const handleSave = () => {
    onSave({
      quantity: qty,
      unitCost: cost,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-background rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">
            {isNew ? "Agregar Producto" : "Editar Producto"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CardContent className="p-4 space-y-4">
          {!isNew && item && (
            <div className="space-y-1">
              <p className="font-medium">{item.productName}</p>
              {item.variantName && (
                <p className="text-sm text-muted-foreground">{item.variantName}</p>
              )}
            </div>
          )}

          {isNew && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center py-4">
                La selección de productos estará disponible pronto.
                <br />
                Por ahora, usa la calculadora en la compra original.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad (kg)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-lg font-medium"
                step="0.1"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Costo Unitario (S/)</label>
              <input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-lg font-medium"
                step="0.01"
                min="0"
              />
            </div>

            <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl">
              <span className="font-medium">Total:</span>
              <span className="text-2xl font-bold text-orange-600">
                S/ {formatCurrency(total)}
              </span>
            </div>
          </div>
        </CardContent>

        <div className="sticky bottom-0 bg-background border-t p-4 space-y-2">
          <Button
            onClick={handleSave}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
            disabled={isNew}
          >
            {isNew ? "Agregar (próximamente)" : "Guardar"}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full rounded-xl"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

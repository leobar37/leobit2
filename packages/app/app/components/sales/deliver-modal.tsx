import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeliverTransaction } from "~/hooks/use-transactions";
import { toast } from "sonner";
import type { SaleItem } from "~/lib/db/schemas/sale";

interface DeliverModalProps {
  saleId: string;
  items: SaleItem[];
  isOpen: boolean;
  onClose: () => void;
  onDelivered: () => void;
}

export function DeliverModal({
  saleId,
  items,
  isOpen,
  onClose,
  onDelivered,
}: DeliverModalProps) {
  const [deliveredItems, setDeliveredItems] = useState<
    Array<{
      itemId: string;
      deliveredQuantity: number;
      unitPriceFinal?: number;
    }>
  >(
    items.map((item) => ({
      itemId: item.id,
      deliveredQuantity: parseFloat(item.quantity),
      unitPriceFinal: parseFloat(item.unitPrice),
    }))
  );
  
  const deliverMutation = useDeliverTransaction();

  const handleDeliver = async () => {
    try {
      await deliverMutation(saleId, deliveredItems);
      toast.success("Pedido entregado exitosamente");
      onDelivered();
      onClose();
    } catch (error) {
      toast.error("Error al entregar pedido");
    }
  };

  const updateDeliveredQuantity = (itemId: string, quantity: number) => {
    setDeliveredItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId
          ? { ...item, deliveredQuantity: quantity }
          : item
      )
    );
  };

  const updateFinalPrice = (itemId: string, price: number) => {
    setDeliveredItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, unitPriceFinal: price } : item
      )
    );
  };

  const total = deliveredItems.reduce((sum, item) => {
    const itemData = items.find((i) => i.id === item.itemId);
    if (!itemData) return sum;
    return sum + item.deliveredQuantity * (item.unitPriceFinal || parseFloat(itemData.unitPrice));
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entregar Pedido</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {items.map((item) => {
            const deliveredItem = deliveredItems.find(
              (d) => d.itemId === item.id
            );
            const orderedQty = parseFloat(item.quantity);
            
            return (
              <div
                key={item.id}
                className="grid grid-cols-3 gap-4 items-center p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.variantName}
                  </p>
                  <p className="text-sm">
                    Ordenado: {orderedQty}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Cantidad Entregada</Label>
                  <Input
                    type="number"
                    min={0}
                    max={orderedQty}
                    step={0.001}
                    value={deliveredItem?.deliveredQuantity || 0}
                    onChange={(e) =>
                      updateDeliveredQuantity(item.id, parseFloat(e.target.value))
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Precio Final (S/)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={deliveredItem?.unitPriceFinal || parseFloat(item.unitPrice)}
                    onChange={(e) =>
                      updateFinalPrice(item.id, parseFloat(e.target.value))
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center py-4 border-t">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold text-orange-500">
            S/ {total.toFixed(2)}
          </span>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeliver}
            className="bg-orange-500 hover:bg-orange-600"
          >
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

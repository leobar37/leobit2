import { useState, useMemo } from "react";
import { Plus, Trash2, Package, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerSearch } from "@/components/sales/customer-search";
import type { Customer } from "~/lib/db/schema";

interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  orderedQuantity: number;
  unitPriceQuoted: number;
}

interface OrderFormProps {
  onSubmit: (data: {
    clientId: string;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    totalAmount: number;
    items: OrderItem[];
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function OrderForm({ onSubmit, onCancel, isSubmitting }: OrderFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentIntent, setPaymentIntent] = useState<"contado" | "credito">("contado");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);

  // Temporary state for new item
  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    productName: "",
    variantName: "",
    orderedQuantity: 0,
    unitPriceQuoted: 0,
  });

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + item.orderedQuantity * item.unitPriceQuoted;
    }, 0);
  }, [items]);

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const handleAddItem = () => {
    if (
      newItem.productName &&
      newItem.variantName &&
      newItem.orderedQuantity &&
      newItem.unitPriceQuoted
    ) {
      const item: OrderItem = {
        productId: `temp-${Date.now()}`,
        variantId: `temp-variant-${Date.now()}`,
        productName: newItem.productName,
        variantName: newItem.variantName,
        orderedQuantity: Number(newItem.orderedQuantity),
        unitPriceQuoted: Number(newItem.unitPriceQuoted),
      };
      setItems([...items, item]);
      setNewItem({
        productName: "",
        variantName: "",
        orderedQuantity: 0,
        unitPriceQuoted: 0,
      });
      setShowItemForm(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedCustomer || !deliveryDate || items.length === 0) return;

    onSubmit({
      clientId: selectedCustomer.id,
      deliveryDate,
      paymentIntent,
      totalAmount,
      items,
    });
  };

  const isValid = selectedCustomer && deliveryDate && items.length > 0;

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Cliente
        </Label>
        <CustomerSearch
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
        />
      </div>

      {/* Delivery Date */}
      <div className="space-y-2">
        <Label htmlFor="deliveryDate" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Fecha de entrega
        </Label>
        <Input
          id="deliveryDate"
          type="date"
          min={getTomorrow()}
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="rounded-xl"
        />
        <p className="text-xs text-muted-foreground">
          La fecha de entrega debe ser desde mañana
        </p>
      </div>

      {/* Payment Intent */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Forma de pago
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={paymentIntent === "contado" ? "default" : "outline"}
            onClick={() => setPaymentIntent("contado")}
            className="flex-1 rounded-xl"
          >
            Contado
          </Button>
          <Button
            type="button"
            variant={paymentIntent === "credito" ? "default" : "outline"}
            onClick={() => setPaymentIntent("credito")}
            className="flex-1 rounded-xl"
          >
            Crédito
          </Button>
        </div>
      </div>

      {/* Items Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items del pedido
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowItemForm(true)}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>

        {/* Items List */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.variantName} · {item.orderedQuantity} unidades
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        S/ {(item.orderedQuantity * item.unitPriceQuoted).toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Item Form */}
        {showItemForm && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-sm">Producto</Label>
                  <Input
                    placeholder="Nombre del producto"
                    value={newItem.productName || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, productName: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm">Variante</Label>
                  <Input
                    placeholder="Ej: 2kg, Grande"
                    value={newItem.variantName || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, variantName: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm">Cantidad</Label>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="0.000"
                    value={newItem.orderedQuantity || ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        orderedQuantity: parseFloat(e.target.value),
                      })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm">Precio unitario</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newItem.unitPriceQuoted || ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        unitPriceQuoted: parseFloat(e.target.value),
                      })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowItemForm(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={
                    !newItem.productName ||
                    !newItem.variantName ||
                    !newItem.orderedQuantity ||
                    !newItem.unitPriceQuoted
                  }
                  className="flex-1 rounded-xl"
                >
                  Agregar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Total */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-orange-100">Total del pedido</span>
            <span className="text-2xl font-bold">S/ {totalAmount.toFixed(2)}</span>
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
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="flex-1 rounded-xl h-12"
        >
          {isSubmitting ? "Guardando..." : "Crear pedido"}
        </Button>
      </div>
    </div>
  );
}

// Import User icon
import { User } from "lucide-react";

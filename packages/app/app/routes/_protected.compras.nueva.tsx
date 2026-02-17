import { useNavigate } from "react-router";
import { useState } from "react";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCreatePurchase } from "~/hooks/use-purchases";
import { useSuppliers } from "~/hooks/use-suppliers";
import { useProducts } from "~/hooks/use-products";
import { useSetLayout } from "~/components/layout/app-layout";

interface PurchaseItem {
  productId: string;
  quantity: number;
  unitCost: number;
}

export default function NuevaCompraPage() {
  const navigate = useNavigate();
  const { mutate: createPurchase, isPending } = useCreatePurchase();
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();

  useSetLayout({
    title: "Nueva Compra",
    showBackButton: true,
    backHref: "/compras",
  });

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [notes, setNotes] = useState("");

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 0, unitCost: 0 }]);
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) return;

    createPurchase(
      {
        supplierId,
        purchaseDate,
        notes,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      },
      {
        onSuccess: () => {
          navigate("/compras");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
          <ShoppingCart className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Registra una nueva compra de productos
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Proveedor *</Label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            required
          >
            <option value="">Seleccionar proveedor...</option>
            {suppliers?.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Fecha de compra *</Label>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Productos *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <Card key={index} className="border-0 shadow-md rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <select
                    value={item.productId}
                    onChange={(e) =>
                      updateItem(index, "productId", e.target.value)
                    }
                    className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Seleccionar producto...</option>
                    {products?.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Costo unitario (S/)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost || ""}
                        onChange={(e) =>
                          updateItem(index, "unitCost", parseFloat(e.target.value) || 0)
                        }
                        className="rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Subtotal: S/ {(item.quantity * item.unitCost).toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notas</Label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información adicional sobre la compra"
            className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl">
          <span className="font-medium">Total:</span>
          <span className="text-xl font-bold">S/ {totalAmount.toFixed(2)}</span>
        </div>

        <Button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
          disabled={isPending || !supplierId || items.length === 0}
        >
          {isPending ? "Guardando..." : "Guardar Compra"}
        </Button>
      </div>
    </form>
  );
}

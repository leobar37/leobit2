import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "~/hooks/use-team";
import { useProducts, type Product } from "~/hooks/use-products";
import { type ProductVariant } from "~/hooks/use-product-variants";
import {
  type CreateDistribucionInput,
} from "~/hooks/use-distribuciones";
import { ProductVariantSelector } from "./product-variant-selector";

interface CreateDistribucionFormProps {
  onSubmit: (data: CreateDistribucionInput) => void;
}

interface DistributionItem {
  variantId: string;
  variantName: string;
  productName: string;
  cantidadAsignada: number;
  unidad: string;
}

export function CreateDistribucionForm({
  onSubmit,
}: CreateDistribucionFormProps) {
  const { data: team } = useTeam();
  const { data: products } = useProducts();

  const [vendedorId, setVendedorId] = useState("");
  const [puntoVenta, setPuntoVenta] = useState("");
  const [items, setItems] = useState<DistributionItem[]>([]);

  const vendedores =
    team?.filter((m) => m.role === "VENDEDOR" && m.isActive) || [];

  const handleAddItem = (
    variant: ProductVariant,
    product: Product | undefined,
    cantidad: number
  ) => {
    const existingIndex = items.findIndex(
      (item) => item.variantId === variant.id
    );
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        cantidadAsignada:
          updatedItems[existingIndex].cantidadAsignada + cantidad,
      };
      setItems(updatedItems);
    } else {
      setItems([
        ...items,
        {
          variantId: variant.id,
          variantName: variant.name,
          productName: product?.name || "Producto",
          cantidadAsignada: cantidad,
          unidad: "kg",
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalKilos = items.reduce(
    (sum, item) => sum + item.cantidadAsignada,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendedorId || items.length === 0) return;

    onSubmit({
      vendedorId,
      puntoVenta: puntoVenta || "Sin punto",
      items: items.map((item) => ({
        variantId: item.variantId,
        cantidadAsignada: item.cantidadAsignada,
        unidad: item.unidad,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="vendedorId">Vendedor *</Label>
        <select
          id="vendedorId"
          value={vendedorId}
          onChange={(e) => setVendedorId(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-input bg-background"
          required
        >
          <option value="">Seleccionar vendedor</option>
          {vendedores.length === 0 && (
            <option value="" disabled>No hay vendedores activos</option>
          )}
          {vendedores.map((vendedor) => (
            <option key={vendedor.id} value={vendedor.userId}>
              {vendedor.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="puntoVenta">Punto de Venta</Label>
        <Input
          id="puntoVenta"
          value={puntoVenta}
          onChange={(e) => setPuntoVenta(e.target.value)}
          placeholder="Carro A, Casa, Local..."
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label>Agregar Productos</Label>
        <ProductVariantSelector
          products={products || []}
          onAddItem={handleAddItem}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <Label>Items Asignados ({items.length})</Label>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.variantId}
                className="flex items-center justify-between p-3 bg-orange-50 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.variantName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="bg-white whitespace-nowrap"
                  >
                    {item.cantidadAsignada} {item.unidad}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="p-4 bg-orange-100 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Asignado:</span>
            <span className="text-xl font-bold text-orange-600">
              {totalKilos.toFixed(2)} kg
            </span>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
        disabled={!vendedorId || items.length === 0}
      >
        Crear Distribución
      </Button>
    </form>
  );
}

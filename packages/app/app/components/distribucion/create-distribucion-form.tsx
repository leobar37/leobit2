import { useState, useEffect } from "react";
import { Trash2, MapPin, Users, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { formatKilos } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProducts, type Product } from "~/hooks/use-products";
import { type ProductVariant } from "~/hooks/use-product-variants";
import { type CreateDistribucionInput } from "~/hooks/use-distribuciones";
import { type CustomerGroup } from "~/hooks/use-grupos";
import { ProductVariantSelector } from "./product-variant-selector";
import { VendedorSelect, type VendedorOption } from "./vendedor-select";
import { GroupSelect } from "./group-select";

type ModoDistribucion = "estricto" | "acumulativo" | "libre";

const MODO_OPTIONS: { value: ModoDistribucion; label: string; description: string; icon: React.ElementType }[] = [
  { 
    value: "estricto", 
    label: "Estricto", 
    description: "Productos obligatorios. No puedes exceder lo asignado.",
    icon: Lock
  },
  { 
    value: "acumulativo", 
    label: "Acumulativo", 
    description: "Productos obligatorios. Puedes exceder, luego repones.",
    icon: AlertCircle
  },
  { 
    value: "libre", 
    label: "Libre", 
    description: "Sin productos fijos. Registras al cerrar.",
    icon: CheckCircle2
  },
];

interface CreateDistribucionFormProps {
  onSubmit: (data: CreateDistribucionInput) => void;
  isPending?: boolean;
  onValidityChange?: (isValid: boolean) => void;
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
  isPending = false,
  onValidityChange,
}: CreateDistribucionFormProps) {
  const { data: products } = useProducts();

  const [selectedVendedor, setSelectedVendedor] = useState<VendedorOption | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
  const [puntoVenta, setPuntoVenta] = useState("");
  const [items, setItems] = useState<DistributionItem[]>([]);
  const [modo, setModo] = useState<ModoDistribucion>("estricto");

  const esModoLibre = modo === "libre";
  const requiereProductos = modo !== "libre";
  const isValid = !!selectedVendedor && (esModoLibre || items.length > 0);

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

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
    if (!selectedVendedor) return;
    if (requiereProductos && items.length === 0) return;

    onSubmit({
      vendedorId: selectedVendedor.id,
      puntoVenta: puntoVenta || "Sin punto",
      groupId: selectedGroup?.id,
      modo: modo,
      items: items.map((item) => ({
        variantId: item.variantId,
        cantidadAsignada: item.cantidadAsignada,
        unidad: item.unidad,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Vendedor *</Label>
        <VendedorSelect
          value={selectedVendedor?.id || null}
          selectedVendedor={selectedVendedor}
          onChange={setSelectedVendedor}
          required
          helperText="Seleccione un vendedor"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="puntoVenta">Punto de Venta</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="puntoVenta"
            value={puntoVenta}
            onChange={(e) => setPuntoVenta(e.target.value)}
            placeholder="Carro A, Casa, Local..."
            className="rounded-xl pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Grupo de Clientes
        </Label>
        <GroupSelect
          value={selectedGroup?.id || null}
          selectedGroup={selectedGroup}
          onChange={setSelectedGroup}
          helperText="Se crearán visitas para todos los clientes del grupo"
        />
        {selectedGroup && (
          <p className="text-sm text-muted-foreground">
            Se crearán {selectedGroup.memberCount ?? 0} visitas automáticamente
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Modo de Distribución</Label>
        <RadioGroup
          value={modo}
          onValueChange={(value) => setModo(value as ModoDistribucion)}
          className="space-y-2"
          disabled={isPending}
        >
          {MODO_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  modo === option.value
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-200"
                }`}
              >
                <RadioGroupItem
                  value={option.value}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      {requiereProductos && (
        <div className="space-y-2">
          <ProductVariantSelector
            products={products || []}
            onAddItem={handleAddItem}
          />
        </div>
      )}

      {requiereProductos && items.length > 0 && (
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
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {requiereProductos && items.length > 0 && (
        <div className="p-4 bg-orange-100 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Asignado:</span>
            <span className="text-xl font-bold text-orange-600">
              {formatKilos(totalKilos, 2)} kg
            </span>
          </div>
        </div>
      )}

      <button type="submit" disabled className="hidden" />
    </form>
  );
}

export type { CreateDistribucionFormProps };

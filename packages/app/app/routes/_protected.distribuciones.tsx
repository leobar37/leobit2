import { useState } from "react";
import { Link } from "react-router";
import { Plus, ArrowLeft, Calendar, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "~/lib/utils";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { DistribucionTable } from "~/components/distribucion/distribucion-table";
import { getToday } from "~/lib/date-utils";
import {
  useDistribuciones,
  useCreateDistribucion,
  useUpdateDistribucion,
  useCloseDistribucion,
  useDeleteDistribucion,
  type Distribucion,
  type CreateDistribucionInput,
} from "~/hooks/use-distribuciones";
import { useProducts, type Product } from "~/hooks/use-products";
import { useVariantsByProduct, type ProductVariant } from "~/hooks/use-product-variants";
import { useTeam } from "~/hooks/use-team";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/hooks/use-business";

function getTodayDate() {
  return getToday();
}

export default function DistribucionesPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [editingDistribucion, setEditingDistribucion] = useState<Distribucion | null>(
    null
  );
  const { data: business } = useBusiness();
  const isAdmin = business?.role === "ADMIN_NEGOCIO";

  const { data: distribucionesData, isLoading } = useDistribuciones({
    fecha: selectedDate,
  });

  const createMutation = useCreateDistribucion();
  const updateMutation = useUpdateDistribucion();
  const closeMutation = useCloseDistribucion();
  const deleteMutation = useDeleteDistribucion();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const distribuciones = Array.isArray(distribucionesData) ? distribucionesData : [];
  const totalAsignado = distribuciones.reduce(
    (sum, d) => sum + (d.kilosAsignados || 0),
    0
  );
  const totalVendido = distribuciones.reduce(
    (sum, d) => sum + (d.kilosVendidos || 0),
    0
  );

  const handleCreate = async (data: CreateDistribucionInput) => {
    await createMutation.mutateAsync(data);
    setIsCreateOpen(false);
  };

  const handleEdit = async (data: Partial<Distribucion> & { id: string }) => {
    await updateMutation.mutateAsync(data);
    setEditingDistribucion(null);
  };

  const handleClose = async (id: string) => {
    const confirmed = await confirm({
      title: "Cerrar distribución",
      description: "¿Estás seguro de cerrar esta distribución? Esta acción no se puede deshacer.",
      confirmText: "Cerrar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      await closeMutation.mutateAsync(id);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar distribución",
      description: "¿Estás seguro de eliminar esta distribución? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-3 sm:px-4">
          <div className="flex items-center">
            <Link to="/config">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Distribuciones</h1>
          </div>
          {isAdmin && (
            <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DrawerTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Nueva Distribución</DrawerTitle>
                </DrawerHeader>
                <CreateDistribucionForm onSubmit={handleCreate} />
              </DrawerContent>
            </Drawer>
          )}
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-24 space-y-4">
        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <span className="font-medium">{selectedDate}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsDatePickerOpen(true)}
              className={cn(
                "w-full justify-start text-left font-normal rounded-xl",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4 text-orange-600" />
              {selectedDate ? (
                format(new Date(selectedDate), "PPP", { locale: es })
              ) : (
                <span>Seleccionar fecha</span>
              )}
              <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
            </Button>

            <Drawer open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <DrawerContent className="max-w-md mx-auto">
                <DrawerHeader className="border-b border-orange-100">
                  <DrawerTitle className="text-center text-lg">Seleccionar Fecha</DrawerTitle>
                </DrawerHeader>
                <div className="p-6 flex justify-center">
                  <CalendarComponent
                    mode="single"
                    selected={new Date(selectedDate)}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(format(date, "yyyy-MM-dd"));
                        setIsDatePickerOpen(false);
                      }
                    }}
                    className="[&_.rdp-caption]:text-orange-600 [&_.rdp-caption]:font-semibold [&_.rdp-caption]:text-lg [&_.rdp-head_cell]:text-orange-600 [&_.rdp-head_cell]:font-medium [&_.rdp-cell]:text-base [&_.rdp-button]:w-10 [&_.rdp-button]:h-10 [&_.rdp-day_today]:bg-orange-100 [&_.rdp-day_today]:text-orange-700 [&_.rdp-day_selected]:bg-orange-500 [&_.rdp-day_selected]:text-white"
                    initialFocus
                  />
                </div>
                <div className="p-4 border-t border-orange-100">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => setIsDatePickerOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </DrawerContent>
            </Drawer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Resumen del Día</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-orange-50 rounded-xl">
                <span className="text-xl font-bold text-orange-600">
                  {totalAsignado.toFixed(0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Asignado (kg)</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <span className="text-xl font-bold text-green-600">
                  {totalVendido.toFixed(0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Vendido (kg)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DistribucionTable
          distribuciones={distribuciones}
          onEdit={(dist) => setEditingDistribucion(dist)}
          onClose={handleClose}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </main>

      <Drawer
        open={!!editingDistribucion}
        onOpenChange={() => setEditingDistribucion(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Editar Distribución</DrawerTitle>
          </DrawerHeader>
          {editingDistribucion && (
            <EditDistribucionForm
              distribucion={editingDistribucion}
              onSubmit={handleEdit}
            />
          )}
        </DrawerContent>
      </Drawer>

      <ConfirmDialog />
    </div>
  );
}

function CreateDistribucionForm({
  onSubmit,
}: {
  onSubmit: (data: CreateDistribucionInput) => void;
}) {
  const { data: team } = useTeam();
  const { data: products } = useProducts();

  const [vendedorId, setVendedorId] = useState("");
  const [puntoVenta, setPuntoVenta] = useState("");
  const [items, setItems] = useState<Array<{
    variantId: string;
    variantName: string;
    productName: string;
    cantidadAsignada: number;
    unidad: string;
  }>>([]);

  const vendedores = team?.filter((m) => m.role === "VENDEDOR" && m.isActive) || [];

  const handleAddItem = (variant: ProductVariant, product: Product | undefined, cantidad: number) => {
    const existingIndex = items.findIndex((item) => item.variantId === variant.id);
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        cantidadAsignada: updatedItems[existingIndex].cantidadAsignada + cantidad,
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

  const totalKilos = items.reduce((sum, item) => sum + item.cantidadAsignada, 0);

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
                  <p className="font-medium text-sm truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.variantName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-white whitespace-nowrap">
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

function ProductVariantSelector({
  products,
  onAddItem,
}: {
  products: Product[];
  onAddItem: (variant: ProductVariant, product: Product | undefined, cantidad: number) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<string>("");

  const { data: variants } = useVariantsByProduct(selectedProductId || "", {
    isActive: true,
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = variants?.find((v) => v.id === selectedVariantId);

  const handleAdd = () => {
    if (selectedVariant && parseFloat(cantidad) > 0) {
      onAddItem(selectedVariant, selectedProduct, parseFloat(cantidad));
      setSelectedProductId(null);
      setSelectedVariantId(null);
      setCantidad("");
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-xl bg-gray-50/50">
      <div className="space-y-2">
        <Label className="text-sm">Producto</Label>
        <select
          value={selectedProductId || ""}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedProductId(value || null);
            setSelectedVariantId(null);
          }}
          className="w-full h-10 px-3 rounded-xl border border-input bg-white"
        >
          <option value="">Seleccionar producto</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProductId && (
        <div className="space-y-2">
          <Label className="text-sm">Variante</Label>
          <select
            value={selectedVariantId || ""}
            onChange={(e) => setSelectedVariantId(e.target.value || null)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-white"
          >
            <option value="">Seleccionar variante</option>
            {variants?.length === 0 && (
              <option value="" disabled>No hay variantes disponibles</option>
            )}
            {variants?.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
                {variant.inventory ? ` (Stock: ${parseFloat(variant.inventory.quantity).toFixed(1)} kg)` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedVariantId && (
        <div className="space-y-2">
          <Label className="text-sm">Cantidad (kg)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Ej: 25"
              className="rounded-xl bg-white"
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!cantidad || parseFloat(cantidad) <= 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {selectedVariant?.inventory && (
            <p className="text-xs text-muted-foreground">
              Disponible: {parseFloat(selectedVariant.inventory.quantity).toFixed(1)} kg
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EditDistribucionForm({
  distribucion,
  onSubmit,
}: {
  distribucion: Distribucion;
  onSubmit: (data: Partial<Distribucion> & { id: string }) => void;
}) {
  const [formData, setFormData] = useState({
    puntoVenta: distribucion.puntoVenta,
    kilosAsignados: distribucion.kilosAsignados,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ id: distribucion.id, ...formData });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor="puntoVenta">Punto de Venta</Label>
        <Input
          id="puntoVenta"
          value={formData.puntoVenta}
          onChange={(e) =>
            setFormData({ ...formData, puntoVenta: e.target.value })
          }
          className="rounded-xl"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kilosAsignados">Kilos Asignados</Label>
        <Input
          id="kilosAsignados"
          type="number"
          step="0.1"
          min="0.1"
          value={formData.kilosAsignados}
          onChange={(e) =>
            setFormData({
              ...formData,
              kilosAsignados: parseFloat(e.target.value) || 0,
            })
          }
          className="rounded-xl"
          required
        />
      </div>

      {distribucion.items && distribucion.items.length > 0 && (
        <div className="space-y-2">
          <Label>Items Asignados (solo lectura)</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {distribucion.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.variant?.product?.name || "Producto"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant?.name || "Variante"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {item.cantidadAsignada} {item.unidad}
                  </p>
                  {item.cantidadVendida > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Vendido: {item.cantidadVendida} {item.unidad}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
      >
        Guardar Cambios
      </Button>
    </form>
  );
}

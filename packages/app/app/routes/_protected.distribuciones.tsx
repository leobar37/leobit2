import { useState } from "react";
import { Link } from "react-router";
import { Plus, ArrowLeft, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DistribucionTable } from "~/components/distribucion/distribucion-table";
import {
  useDistribuciones,
  useCreateDistribucion,
  useUpdateDistribucion,
  useCloseDistribucion,
  useDeleteDistribucion,
  type Distribucion,
  type CreateDistribucionInput,
} from "~/hooks/use-distribuciones";
import { useInventory } from "~/hooks/use-inventory";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export default function DistribucionesPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDistribucion, setEditingDistribucion] = useState<Distribucion | null>(
    null
  );

  const { data: distribuciones = [], isLoading } = useDistribuciones({
    fecha: selectedDate,
  });
  const { data: inventory } = useInventory();

  const createMutation = useCreateDistribucion();
  const updateMutation = useUpdateDistribucion();
  const closeMutation = useCloseDistribucion();
  const deleteMutation = useDeleteDistribucion();

  const totalAsignado = distribuciones.reduce(
    (sum, d) => sum + d.kilosAsignados,
    0
  );
  const totalVendido = distribuciones.reduce(
    (sum, d) => sum + d.kilosVendidos,
    0
  );
  const totalInventario = inventory?.reduce(
    (sum, item) => sum + item.quantity,
    0
  ) ?? 0;

  const handleCreate = async (data: CreateDistribucionInput) => {
    await createMutation.mutateAsync(data);
    setIsCreateOpen(false);
  };

  const handleEdit = async (data: Partial<Distribucion> & { id: string }) => {
    await updateMutation.mutateAsync(data);
    setEditingDistribucion(null);
  };

  const handleClose = async (id: string) => {
    if (confirm("¿Estás seguro de cerrar esta distribución?")) {
      await closeMutation.mutateAsync(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta distribución?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Distribuciones</h1>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Nueva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Distribución</DialogTitle>
              </DialogHeader>
              {<CreateDistribucionForm onSubmit={handleCreate} />
              }
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <span className="font-medium">{selectedDate}</span>
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl"
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Resumen de Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <span className="text-xl font-bold text-blue-600">
                  {totalInventario.toFixed(0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Total</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-xl">
                <span className="text-xl font-bold text-orange-600">
                  {totalAsignado.toFixed(0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Asignado</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <span className="text-xl font-bold text-green-600">
                  {(totalInventario - totalAsignado).toFixed(0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Disponible</p>
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

      <Dialog
        open={!!editingDistribucion}
        onOpenChange={() => setEditingDistribucion(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Distribución</DialogTitle>
          </DialogHeader>
          {editingDistribucion && (
            <EditDistribucionForm
              distribucion={editingDistribucion}
              onSubmit={handleEdit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateDistribucionForm({
  onSubmit,
}: {
  onSubmit: (data: CreateDistribucionInput) => void;
}) {
  const [formData, setFormData] = useState<CreateDistribucionInput>({
    vendedorId: "",
    puntoVenta: "",
    kilosAsignados: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="vendedorId">ID del Vendedor</Label>
        <Input
          id="vendedorId"
          value={formData.vendedorId}
          onChange={(e) =>
            setFormData({ ...formData, vendedorId: e.target.value })
          }
          placeholder="user_123"
          className="rounded-xl"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="puntoVenta">Punto de Venta</Label>
        <Input
          id="puntoVenta"
          value={formData.puntoVenta}
          onChange={(e) =>
            setFormData({ ...formData, puntoVenta: e.target.value })
          }
          placeholder="Carro A, Casa, Local..."
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
          value={formData.kilosAsignados || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              kilosAsignados: parseFloat(e.target.value) || 0,
            })
          }
          placeholder="50"
          className="rounded-xl"
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
      >
        Crear Distribución
      </Button>
    </form>
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
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
      >
        Guardar Cambios
      </Button>
    </form>
  );
}

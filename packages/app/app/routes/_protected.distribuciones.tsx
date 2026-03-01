import { useState } from "react";
import { Link } from "react-router";
import { Plus, ArrowLeft, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getToday, parseDateString } from "~/lib/date-utils";
import { useBusiness } from "@/hooks/use-business";
import {
  useDistribuciones,
  useCreateDistribucion,
  useUpdateDistribucion,
  useCloseDistribucion,
  useDeleteDistribucion,
  type Distribucion,
  type CreateDistribucionInput,
} from "~/hooks/use-distribuciones";
import {
  DistribucionTable,
  CreateDistribucionForm,
  EditDistribucionForm,
} from "~/components/distribucion";

export default function DistribucionesPage() {
  const [selectedDate, setSelectedDate] = useState(getToday());
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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(format(date, "yyyy-MM-dd"));
      setIsDatePickerOpen(false);
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
              <DrawerContent className="max-h-[85vh]">
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
                    selected={parseDateString(selectedDate)}
                    onSelect={handleDateSelect}
                    className="[\&_.rdp-caption]:text-orange-600 [\&_.rdp-caption]:font-semibold [\&_.rdp-caption]:text-lg [\&_.rdp-head_cell]:text-orange-600 [\&_.rdp-head_cell]:font-medium [\&_.rdp-cell]:text-base [\&_.rdp-button]:w-10 [\&_.rdp-button]:h-10 [\&_.rdp-day_today]:bg-orange-100 [\&_.rdp-day_today]:text-orange-700 [\&_.rdp-day_selected]:bg-orange-500 [\&_.rdp-day_selected]:text-white"
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
          onEdit={setEditingDistribucion}
          onClose={handleClose}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </main>

      <Drawer
        open={!!editingDistribucion}
        onOpenChange={() => setEditingDistribucion(null)}
      >
        <DrawerContent className="max-h-[85vh]">
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

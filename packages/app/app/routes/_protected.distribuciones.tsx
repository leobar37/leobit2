import { useState } from "react";
import { Link } from "react-router";
import { formatKilos } from "~/lib/utils";
import { Plus, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDrawer } from "@/components/ui/app-drawer";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { getToday } from "~/lib/date-utils";
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
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormDate } from "@/components/forms/form-date";

const distribucionFilterSchema = z.object({
  fecha: z.string(),
});

type DistribucionFilterData = z.infer<typeof distribucionFilterSchema>;

export default function DistribucionesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDistribucion, setEditingDistribucion] = useState<Distribucion | null>(
    null
  );
  const { data: business } = useBusiness();
  const isAdmin = business?.role === "ADMIN_NEGOCIO";

  const filterForm = useForm<DistribucionFilterData>({
    resolver: zodResolver(distribucionFilterSchema),
    defaultValues: {
      fecha: getToday(),
    },
  });

  const selectedDate = filterForm.watch("fecha") || getToday();

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
            <>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva
              </Button>
              <AppDrawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <AppDrawer.Header
                  title="Nueva Distribución"
                  onClose={() => setIsCreateOpen(false)}
                />
                <AppDrawer.Body>
                  <CreateDistribucionForm onSubmit={handleCreate} />
                </AppDrawer.Body>
              </AppDrawer>
            </>
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
            <FormProvider {...filterForm}>
              <FormDate
                name="fecha"
                label="Seleccionar fecha"
                quickActionLabels={["Hoy", "Mañana"]}
              />
            </FormProvider>
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
                  {formatKilos(totalAsignado, 0)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Asignado (kg)</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <span className="text-xl font-bold text-green-600">
                  {formatKilos(totalVendido, 0)}
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

      <AppDrawer
        open={!!editingDistribucion}
        onOpenChange={() => setEditingDistribucion(null)}
      >
        <AppDrawer.Header
          title="Editar Distribución"
          onClose={() => setEditingDistribucion(null)}
        />
        <AppDrawer.Body>
          {editingDistribucion && (
            <EditDistribucionForm
              distribucion={editingDistribucion}
              onSubmit={handleEdit}
            />
          )}
        </AppDrawer.Body>
      </AppDrawer>

      <ConfirmDialog />
    </div>
  );
}

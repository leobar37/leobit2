import { formatKilos } from "~/lib/utils";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { getToday } from "~/lib/date-utils";
import { useBusiness } from "@/hooks/use-business";
import {
  useDistribuciones,
  useCloseDistribucion,
  useDeleteDistribucion,
  type Distribucion,
} from "~/hooks/use-distribuciones";
import { DistribucionTable } from "~/components/distribucion";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormDate } from "@/components/forms/form-date";
import { useDistribucionParams } from "~/hooks/use-distribucion-params";
import { useSetLayout } from "~/components/layout/app-layout";

const distribucionFilterSchema = z.object({
  fecha: z.string(),
});

type DistribucionFilterData = z.infer<typeof distribucionFilterSchema>;

export default function DistribucionesPage() {
  const { data: business } = useBusiness();
  const isAdmin = business?.role === "ADMIN_NEGOCIO";
  const { navigateToCreate, navigateToEdit } = useDistribucionParams();

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

  const closeMutation = useCloseDistribucion();
  const deleteMutation = useDeleteDistribucion();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const distribuciones = distribucionesData ?? [];
  const totalAsignado = distribuciones.reduce(
    (sum, d) => sum + (d.kilosAsignados || 0),
    0
  );
  const totalVendido = distribuciones.reduce(
    (sum, d) => sum + (d.kilosVendidos || 0),
    0
  );

  const handleNavigateToCreate = () => {
    navigateToCreate({ fecha: selectedDate });
  };

  const handleNavigateToEdit = (distribucion: Distribucion) => {
    navigateToEdit(distribucion.id);
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

  useSetLayout({
    title: "Distribuciones",
    showBottomNav: true,
    showBackButton: true,
    backHref: "/config",
    actions: isAdmin ? (
      <Button
        className="bg-orange-500 hover:bg-orange-600"
        onClick={handleNavigateToCreate}
      >
        <Plus className="h-4 w-4 mr-2" />
        Nueva
      </Button>
    ) : undefined,
  });

  return (
    <div className="space-y-4">
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
        onEdit={handleNavigateToEdit}
        onClose={handleClose}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <ConfirmDialog />
    </div>
  );
}

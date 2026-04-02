import { Outlet, useLocation } from "react-router";
import { formatKilos } from "~/lib/utils";
import { Plus, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
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
import { useSync } from "~/components/sync/sync-status";
import { useTeam } from "~/hooks/use-team";
import { useState } from "react";

const distribucionFilterSchema = z.object({
  fecha: z.string(),
});

type DistribucionFilterData = z.infer<typeof distribucionFilterSchema>;

export default function DistribucionesPage() {
  const location = useLocation();
  const isIndexRoute = location.pathname === "/distribuciones";
  const { data: business } = useBusiness();
  const { data: team = [] } = useTeam();
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
  const { isOnline } = useSync();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [closingDistribucion, setClosingDistribucion] = useState<Distribucion | null>(null);
  const [notaCierre, setNotaCierre] = useState("");

  const distribuciones = (distribucionesData ?? []).map((distribucion) => {
    const vendedor = team.find((member) => member.id === distribucion.vendedorId);

    return {
      ...distribucion,
      vendedorName: vendedor?.name ?? null,
    };
  });

  const distribucionesActivas = distribuciones.filter((d) => d.estado === "activo").length;
  const distribucionesCerradas = distribuciones.filter((d) => d.estado === "cerrado").length;

  const handleNavigateToCreate = () => {
    navigateToCreate({ fecha: selectedDate });
  };

  const handleNavigateToEdit = (distribucion: Distribucion) => {
    navigateToEdit(distribucion.id);
  };

  const handleClose = async (distribucion: Distribucion) => {
    if (!isOnline) {
      toast.error("Sin conexión", {
        description: "Se requiere conexión a internet para cerrar una distribución.",
      });
      return;
    }

    setClosingDistribucion(distribucion);
  };

  const handleConfirmClose = async () => {
    if (!closingDistribucion) return;

    try {
      await closeMutation.mutateAsync({
        id: closingDistribucion.id,
        notaCierre: notaCierre.trim() || undefined,
      });
      setClosingDistribucion(null);
      setNotaCierre("");
    } catch (error) {
      console.error("[Distribuciones] Close failed:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isOnline) {
      toast.error("Sin conexión", {
        description: "Se requiere conexión a internet para eliminar una distribución.",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Eliminar distribución",
      description: "¿Estás seguro de eliminar esta distribución? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      setDeletingId(id);
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Distribución eliminada", {
          description: "La distribución se ha eliminado correctamente.",
        });
      } catch (error) {
        console.error("[Distribuciones] Delete failed:", error);
        toast.error("Error al eliminar", {
          description: error instanceof Error ? error.message : "No se pudo eliminar la distribución.",
        });
      } finally {
        setDeletingId(null);
      }
    }
  };

  useSetLayout({
    title: "Distribuciones del día",
    showBottomNav: true,
    showBackButton: true,
    backHref: "/config",
  });

  // When not on index route, render child routes via Outlet
  if (!isIndexRoute) {
    return <Outlet />;
  }

  return (
    <>
      <div className="space-y-4 pb-24">
        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Sin conexión a internet. Algunas acciones como crear, eliminar o cerrar distribuciones requieren conexión.
            </AlertDescription>
          </Alert>
        )}

        <FormProvider {...filterForm}>
          <div className="shell-card-flat rounded-[22px] border border-stone-200/85 p-3">
            <FormDate
              name="fecha"
              quickActionLabels={["Hoy", "Mañana"]}
            />
          </div>
        </FormProvider>

        <Card className="shell-card-flat rounded-[24px] border-stone-200/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen del día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="shell-block-muted rounded-[18px] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Total</p>
                <span className="mt-1 block text-2xl font-bold tracking-[-0.04em] text-orange-600">
                  {distribuciones.length}
                </span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">distribuciones</p>
              </div>
              <div className="shell-block-muted rounded-[18px] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Activas</p>
                <span className="mt-1 block text-2xl font-bold tracking-[-0.04em] text-emerald-600">
                  {distribucionesActivas}
                </span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">en ruta</p>
              </div>
              <div className="rounded-[18px] border border-orange-200/80 bg-orange-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-orange-700">Cerradas</p>
                <span className="mt-1 block text-2xl font-bold tracking-[-0.04em] text-orange-700">
                  {distribucionesCerradas}
                </span>
                <p className="mt-0.5 text-[11px] text-orange-700/80">finalizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-base font-semibold text-foreground">Asignaciones</p>
            <p className="text-sm text-muted-foreground">
              {distribuciones.length > 0
                ? `${distribuciones.length} distribución${distribuciones.length === 1 ? "" : "es"} para esta fecha`
                : "Aún no hay distribuciones registradas para esta fecha"}
            </p>
          </div>
        </div>

        <DistribucionTable
          distribuciones={distribuciones}
          onEdit={handleNavigateToEdit}
          onClose={handleClose}
          onDelete={handleDelete}
          isLoading={isLoading}
          deletingId={deletingId}
        />

        <ConfirmDialog />

        <Drawer
          open={!!closingDistribucion}
          onOpenChange={(open) => {
            if (!open) {
              setClosingDistribucion(null);
              setNotaCierre("");
            }
          }}
        >
          <DrawerContent className="px-4 pb-6 pt-2">
            <DrawerHeader className="space-y-2 text-left">
              <DrawerTitle>Cerrar distribución</DrawerTitle>
              <DrawerDescription>
                Esta acción no se puede deshacer. El stock sobrante será devuelto al inventario.
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-2 px-1 py-2">
              <Label htmlFor="nota-cierre-listado">Nota al cerrar</Label>
              <Textarea
                id="nota-cierre-listado"
                value={notaCierre}
                onChange={(event) => setNotaCierre(event.target.value)}
                placeholder="Observaciones finales de la distribución..."
                className="min-h-[120px] resize-none rounded-xl"
                disabled={closeMutation.isPending}
              />
            </div>

            <DrawerFooter className="gap-3 sm:flex-col">
              <Button
                variant="destructive"
                onClick={handleConfirmClose}
                disabled={closeMutation.isPending}
                className="h-12 rounded-xl"
              >
                {closeMutation.isPending ? "Cerrando..." : "Confirmar cierre"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setClosingDistribucion(null);
                  setNotaCierre("");
                }}
                disabled={closeMutation.isPending}
                className="h-12 rounded-xl"
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {isAdmin && (
        <Button
          size="icon"
          className="fixed right-4 bottom-28 z-50 h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
          onClick={handleNavigateToCreate}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </>
  );
}

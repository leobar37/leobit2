/**
 * Puntos de Venta Configuration Page
 * Manage sales points for distribution assignments
 */
import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppDrawer } from "~/components/ui/app-drawer";
import { PuntoVentaForm } from "~/components/puntos-venta/punto-venta-form";
import { usePuntosVenta, useDeletePuntoVenta, useTogglePuntoVenta, type PuntoVenta } from "~/hooks/use-puntos-venta";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";

const TYPE_LABELS: Record<string, string> = {
  carro: "Carro",
  local: "Local",
  mercado: "Mercado",
  ruta: "Ruta",
  otro: "Otro",
};

export default function PuntosVentaConfigPage() {
  const { data: puntosVenta, isLoading } = usePuntosVenta();
  const deletePuntoVenta = useDeletePuntoVenta();
  const togglePuntoVenta = useTogglePuntoVenta();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPuntoVenta, setEditingPuntoVenta] = useState<PuntoVenta | null>(null);
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar punto de venta",
      description: "¿Estás seguro de que deseas eliminar este punto de venta? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deletePuntoVenta.mutateAsync(id);
        toast.success("Punto de venta eliminado");
      } catch (error) {
        toast.error("Error al eliminar el punto de venta");
      }
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await togglePuntoVenta.mutateAsync(id);
      toast.success("Estado actualizado");
    } catch (error) {
      toast.error("Error al actualizar el estado");
    }
  };

  const openCreateModal = () => {
    setEditingPuntoVenta(null);
    setIsModalOpen(true);
  };

  const openEditModal = (puntoVenta: PuntoVenta) => {
    setEditingPuntoVenta(puntoVenta);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPuntoVenta(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Puntos de Venta</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          {/* Intro Card */}
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle>Gestionar Puntos de Venta</CardTitle>
              <CardDescription>
                Define los puntos de venta disponibles para asignar a tus
                distribuciones. Los vendedores podrán seleccionar uno al crear una distribución.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando puntos de venta...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && puntosVenta?.length === 0 && (
            <Card className="border-0 shadow-md rounded-2xl">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No tienes puntos de venta creados
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crea tu primer punto de venta para asignarlo a las distribuciones
                </p>
              </CardContent>
            </Card>
          )}

          {/* Puntos de Venta List */}
          <div className="space-y-3">
            {puntosVenta?.map((puntoVenta) => (
              <Card
                key={puntoVenta.id}
                className={`border-0 shadow-md rounded-2xl hover:shadow-lg transition-shadow ${
                  !puntoVenta.isActive ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{puntoVenta.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {puntoVenta.code && `${puntoVenta.code} • `}
                      {TYPE_LABELS[puntoVenta.type || "otro"]}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg h-9 w-9"
                      onClick={() => openEditModal(puntoVenta)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-lg h-9 w-9 ${
                        puntoVenta.isActive 
                          ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                          : "text-gray-400 hover:text-gray-500 hover:bg-gray-50"
                      }`}
                      onClick={() => handleToggle(puntoVenta.id)}
                      disabled={togglePuntoVenta.isPending}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        puntoVenta.isActive ? "bg-green-500" : "bg-gray-300"
                      }`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(puntoVenta.id)}
                      disabled={deletePuntoVenta.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* FAB - New Punto de Venta */}
      <button
        onClick={openCreateModal}
        className="fixed bottom-28 right-4 z-50 h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create/Edit Drawer */}
      <AppDrawer
        open={isModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeModal();
        }}
      >
        <AppDrawer.Header
          title={editingPuntoVenta ? "Editar Punto de Venta" : "Nuevo Punto de Venta"}
          icon={<MapPin className="h-5 w-5" />}
          onClose={closeModal}
        />
        <AppDrawer.Body>
          <PuntoVentaForm puntoVenta={editingPuntoVenta} onClose={closeModal} />
        </AppDrawer.Body>
      </AppDrawer>

      <ConfirmDialog />
    </div>
  );
}

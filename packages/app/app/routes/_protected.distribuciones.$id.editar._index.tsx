import { useParams } from "react-router";
import { useState } from "react";
import { ArrowLeft, Lock, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EditDistribucionForm } from "~/components/distribucion";
import { useDistribucion, useUpdateDistribucion, useUpdateDistribucionItems, useCloseDistribucion, type Distribucion } from "~/hooks/use-distribuciones";
import { useToastError } from "~/hooks/use-toast-error";
import { Loader2 } from "lucide-react";
import { useDistribucionParams } from "~/hooks/use-distribucion-params";
import { useBusiness } from "@/hooks/use-business";

import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EditarDistribucionPage() {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToastError();
  const { goBack: goBackRoute } = useDistribucionParams();
  const updateMutation = useUpdateDistribucion();
  const updateItemsMutation = useUpdateDistribucionItems();
  const closeMutation = useCloseDistribucion();
  const { data: business } = useBusiness();
  const isAdmin = business?.role === "ADMIN_NEGOCIO";
  const isOnline = true;
  const [isCloseDrawerOpen, setIsCloseDrawerOpen] = useState(false);
  const [notaCierre, setNotaCierre] = useState("");

  const { data: distribucion, isLoading } = useDistribucion(id || "");

  const handleSubmit = async (data: Partial<Distribucion> & { id: string }) => {
    try {
      await updateMutation.mutateAsync(data);
      showSuccess("Distribución actualizada", {
        description: "Los cambios se han guardado exitosamente.",
      });
      goBackRoute();
    } catch (error) {
      showError("Error", error, {
        description: "No se pudo actualizar la distribución",
      });
    }
  };

  const handleUpdateItems = async (items: Array<{ variantId: string; cantidadAsignada: number; unidad: string }>) => {
    if (!id) return;
    try {
      await updateItemsMutation.mutateAsync({ id, items });
      showSuccess("Productos registrados", {
        description: "Los productos se han registrado exitosamente.",
      });
    } catch (error) {
      showError("Error", error, {
        description: "No se pudieron registrar los productos",
      });
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      await closeMutation.mutateAsync({
        id,
        notaCierre: notaCierre.trim() || undefined,
      });
      showSuccess("Distribución cerrada", {
        description: "La distribución se ha cerrado exitosamente.",
      });
      setIsCloseDrawerOpen(false);
      setNotaCierre("");
      goBackRoute();
    } catch (error) {
      showError("Error", error, {
        description: "No se pudo cerrar la distribución",
      });
    }
  };

  const handleCancel = () => {
    goBackRoute();
  };

  const isActive = distribucion?.estado === "activo" || distribucion?.estado === "en_ruta";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!distribucion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Distribución no encontrada</p>
        <Button onClick={handleCancel} variant="outline">
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-3 sm:px-4">
          <button
            onClick={handleCancel}
            className="p-2 -ml-2 rounded-xl hover:bg-orange-50"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg ml-1">Editar Distribución</h1>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          <EditDistribucionForm 
            distribucion={distribucion} 
            onSubmit={handleSubmit} 
            onUpdateItems={handleUpdateItems}
          />
          
          {isActive && isAdmin && (
            <>
              {!isOnline && (
                <Alert variant="destructive" className="mt-4">
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    Se requiere conexión a internet para cerrar una distribución.
                  </AlertDescription>
                </Alert>
              )}
              <Button
                variant="outline"
                className="w-full mt-4 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setIsCloseDrawerOpen(true)}
                disabled={closeMutation.isPending || !isOnline}
              >
                {closeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cerrando...
                  </>
                ) : !isOnline ? (
                  <>
                    <WifiOff className="h-4 w-4 mr-2" />
                    Sin conexión
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Cerrar Distribución
                  </>
                )}
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            className="w-full mt-4 rounded-xl"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>

      <Drawer open={isCloseDrawerOpen} onOpenChange={setIsCloseDrawerOpen}>
        <DrawerContent className="px-4 pb-6 pt-2">
          <DrawerHeader className="space-y-2 text-left">
            <DrawerTitle>Cerrar distribución</DrawerTitle>
            <DrawerDescription>
              Esta acción no se puede deshacer. El stock sobrante será devuelto al inventario.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-2 px-1 py-2">
            <Label htmlFor="nota-cierre-admin">Nota al cerrar</Label>
            <Textarea
              id="nota-cierre-admin"
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
              onClick={handleClose}
              disabled={closeMutation.isPending}
              className="h-12 rounded-xl"
            >
              {closeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cerrando...
                </>
              ) : (
                "Confirmar cierre"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCloseDrawerOpen(false)}
              disabled={closeMutation.isPending}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

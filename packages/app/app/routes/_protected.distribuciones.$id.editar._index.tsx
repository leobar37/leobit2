import { useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditDistribucionForm } from "~/components/distribucion";
import { useDistribucion, useUpdateDistribucion, useUpdateDistribucionItems, type Distribucion } from "~/hooks/use-distribuciones";
import { useToastError } from "~/hooks/use-toast-error";
import { Loader2 } from "lucide-react";
import { useDistribucionParams } from "~/hooks/use-distribucion-params";

export default function EditarDistribucionPage() {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToastError();
  const { goBack: goBackRoute } = useDistribucionParams();
  const updateMutation = useUpdateDistribucion();
  const updateItemsMutation = useUpdateDistribucionItems();

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

  const handleCancel = () => {
    goBackRoute();
  };

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
          <Button
            variant="outline"
            className="w-full mt-4 rounded-xl"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

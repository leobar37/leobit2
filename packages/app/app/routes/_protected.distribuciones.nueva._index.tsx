import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateDistribucionForm } from "~/components/distribucion";
import { useCreateDistribucion, type CreateDistribucionInput } from "~/hooks/use-distribuciones";
import { useToastError } from "~/hooks/use-toast-error";
import { getToday } from "~/lib/date-utils";
import { useSearchParams } from "react-router";
import { useDistribucionParams } from "~/hooks/use-distribucion-params";

export default function NuevaDistribucionPage() {
  const { goBack } = useDistribucionParams();
  const { showSuccess, showError } = useToastError();
  const [searchParams] = useSearchParams();
  const createMutation = useCreateDistribucion();

  const fechaFromUrl = searchParams.get("fecha");
  const selectedDate = fechaFromUrl || getToday();

  const handleSubmit = async (data: CreateDistribucionInput) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        fecha: selectedDate,
      });
      showSuccess("Distribución creada", {
        description: "La distribución se ha creado exitosamente.",
      });
      goBack();
    } catch (error) {
      showError("Error", error, {
        description: "No se pudo crear la distribución",
      });
    }
  };

  const handleCancel = () => {
    goBack();
  };

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
          <h1 className="font-bold text-lg ml-1">Nueva Distribución</h1>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          <CreateDistribucionForm onSubmit={handleSubmit} />
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

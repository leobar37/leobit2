import { Loader2, Save, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateDistribucionForm } from "~/components/distribucion";
import { useCreateDistribucion, type CreateDistribucionInput } from "~/hooks/use-distribuciones";
import { useToastError } from "~/hooks/use-toast-error";
import { getToday } from "~/lib/date-utils";
import { useSearchParams } from "react-router";
import { useDistribucionParams } from "~/hooks/use-distribucion-params";
import { FormPage } from "~/components/layout/form-page";
import { useRef, useState } from "react";

export default function NuevaDistribucionPage() {
  const { goBack } = useDistribucionParams();
  const { showSuccess, showError } = useToastError();
  const [searchParams] = useSearchParams();
  const createMutation = useCreateDistribucion();
  const formRef = useRef<HTMLFormElement>(null);
  const [isValid, setIsValid] = useState(false);

  const fechaFromUrl = searchParams.get("fecha");
  const selectedDate = fechaFromUrl || getToday();

  const handleSubmit = async (data: CreateDistribucionInput) => {
    console.log("[NuevaDistribucion] handleSubmit called with:", data, "fecha:", selectedDate);
    try {
      await createMutation.mutateAsync({
        ...data,
        fecha: selectedDate,
      });
      console.log("[NuevaDistribucion] createMutation succeeded");
      showSuccess("Distribución creada", {
        description: "La distribución se ha creado exitosamente.",
      });
      goBack();
    } catch (error) {
      console.error("[NuevaDistribucion] createMutation failed:", error);
      showError("Error", error, {
        description: "No se pudo crear la distribución",
      });
    }
  };

  const handleFormValidityChange = (valid: boolean) => {
    setIsValid(valid);
  };

  return (
    <FormPage
      title="Nueva Distribución"
      backHref="/distribuciones"
      icon={Package}
      toolbar={
        <Button
          onClick={() => formRef.current?.requestSubmit()}
          disabled={createMutation.isPending || !isValid}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Crear Distribución
            </>
          )}
        </Button>
      }
    >
      <CreateDistribucionForm
        onSubmit={handleSubmit}
        isPending={createMutation.isPending}
        onValidityChange={handleFormValidityChange}
      />
    </FormPage>
  );
}

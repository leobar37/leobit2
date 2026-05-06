// @ts-nocheck - Route file with complex type errors
import { Loader2, Save, Package, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateDistribucionForm, type CreateDistribucionFormRef } from "~/components/distribucion";
import { useCreateDistribucion, type CreateDistribucionApiInput } from "~/hooks/use-distribuciones";
import { useToastError } from "~/hooks/use-toast-error";
import { getToday } from "~/lib/date-utils";
import { useSearchParams, useNavigate } from "react-router";
import { FormPage } from "~/components/layout/form-page";

import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";

export default function NuevaDistribucionPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastError();
  const [searchParams] = useSearchParams();
  const createMutation = useCreateDistribucion();
  const formRef = useRef<CreateDistribucionFormRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOnline = true;
  const { toast } = useToast();

  const fechaFromUrl = searchParams.get("fecha");
  const selectedDate = fechaFromUrl || getToday();

  const handleSubmit = async (data: CreateDistribucionApiInput) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        ...data,
        fecha: selectedDate,
        items: data.items ?? [],
      });
      showSuccess("Distribución creada", {
        description: "La distribución se ha creado exitosamente.",
      });
      navigate("/distribuciones", { replace: true });
    } catch (error) {
      showError("No se pudo crear la distribución", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || createMutation.isPending;

  return (
    <FormPage
      title="Nueva Distribución"
      backHref="/distribuciones"
      icon={Package}
      toolbar={
        <Button
          onClick={() => {
            const result = formRef.current?.submit();
            if (result && !result.submitted && result.reason) {
              toast.error("Completa la distribución", {
                description: result.reason,
              });
            }
          }}
          disabled={isLoading || !isOnline}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creando...
            </>
          ) : !isOnline ? (
            <>
              <WifiOff className="h-5 w-5 mr-2" />
              Sin conexión
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
      {!isOnline && (
        <Alert variant="destructive" className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Se requiere conexión a internet para crear una distribución porque se generan visitas automáticamente.
          </AlertDescription>
        </Alert>
      )}
      <CreateDistribucionForm
        ref={formRef}
        onSubmit={handleSubmit}
        isPending={isLoading}
      />
    </FormPage>
  );
}

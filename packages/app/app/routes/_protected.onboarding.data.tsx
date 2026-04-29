import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Package, Loader2, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormPage } from "~/components/layout/form-page";
import { MobilePage } from "~/components/mobile/mobile-page";
import { api } from "~/lib/api-client";

type OnboardingOption = "demo" | "empty" | null;

export default function OnboardingDataPage() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<OnboardingOption>(null);

  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.businesses["seed-demo"].post();
      if (error) throw new Error(String(error.value));
      return data;
    },
    onSuccess: () => {
      navigate("/dashboard");
    },
  });

  const handleContinue = async () => {
    if (!selectedOption) return;

    if (selectedOption === "demo") {
      await seedDemoMutation.mutateAsync();
    } else {
      navigate("/dashboard");
    }
  };

  const isLoading = seedDemoMutation.isPending;

  return (
    <FormPage
      title=""
      backHref="/business/create"
      maxWidth="sm"
      toolbar={
        <Button
          onClick={handleContinue}
          disabled={!selectedOption || isLoading}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Preparando...
            </>
          ) : (
            "Continuar"
          )}
        </Button>
      }
    >
      <MobilePage.Card variant="flat">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-sm text-orange-600 font-medium mb-1">Paso 3 de 3</p>
            <CardTitle className="text-2xl font-bold text-foreground">
              ¿Quieres empezar con datos de ejemplo?
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <button
            onClick={() => setSelectedOption("demo")}
            disabled={isLoading}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
              selectedOption === "demo"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-orange-200 hover:bg-gray-50"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selectedOption === "demo"
                    ? "bg-orange-500"
                    : "bg-orange-100"
                }`}
              >
                <Sparkles
                  className={`w-6 h-6 ${
                    selectedOption === "demo" ? "text-white" : "text-orange-600"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    Cargar datos de ejemplo
                  </h3>
                  {selectedOption === "demo" && (
                    <CheckCircle2 className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Productos típicos de pollería (pollo entero, medio, cuarto),
                  configuración básica lista para usar.
                </p>
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  Ideal para aprender a usar la app
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedOption("empty")}
            disabled={isLoading}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
              selectedOption === "empty"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-orange-200 hover:bg-gray-50"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selectedOption === "empty"
                    ? "bg-orange-500"
                    : "bg-gray-100"
                }`}
              >
                <Package
                  className={`w-6 h-6 ${
                    selectedOption === "empty" ? "text-white" : "text-gray-600"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    Empezar vacío
                  </h3>
                  {selectedOption === "empty" && (
                    <CheckCircle2 className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Sin productos ni clientes. Configurarás todo desde cero según
                  las necesidades de tu negocio.
                </p>
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  Para negocios que ya saben qué necesitan
                </p>
              </div>
            </div>
          </button>

          {seedDemoMutation.error && (
            <p className="text-sm text-destructive text-center">
              {seedDemoMutation.error instanceof Error
                ? seedDemoMutation.error.message
                : "Error al cargar datos de ejemplo"}
            </p>
          )}
        </CardContent>
      </MobilePage.Card>
    </FormPage>
  );
}

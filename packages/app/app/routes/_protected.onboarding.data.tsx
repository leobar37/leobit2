import { useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, Loader2, Package, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FormPage } from "~/components/layout/form-page";
import { api } from "~/lib/api-client";
import { cn } from "~/lib/utils";
import { useBusinessMode } from "~/hooks/use-business-mode";

type OnboardingOption = "demo" | "empty";

const onboardingOptions: Array<{
  value: OnboardingOption;
  title: string;
  description: string;
  detail: string;
  icon: typeof Sparkles;
}> = [
  {
    value: "demo",
    title: "Cargar datos de ejemplo",
    description: "Productos típicos de pollería y configuración básica lista para vender.",
    detail: "Recomendado para probar la app",
    icon: Sparkles,
  },
  {
    value: "empty",
    title: "Empezar vacío",
    description: "Configura productos, clientes y equipo desde cero cuando entres.",
    detail: "Para negocios que ya tienen su lista definida",
    icon: Package,
  },
];

export default function OnboardingDataPage() {
  const navigate = useNavigate();
  const { mode } = useBusinessMode();
  const [selectedOption, setSelectedOption] = useState<OnboardingOption>("demo");
  const isWaterMode = mode === "agua";
  const options = onboardingOptions.map((option) => {
    if (!isWaterMode || option.value !== "demo") return option;
    return {
      ...option,
      description: "Bidón 20L, Bidón 10L y configuración inicial para vender por unidad.",
      detail: "Recomendado para probar reparto de agua",
    };
  });

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
          disabled={isLoading}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Preparando...
            </>
          ) : selectedOption === "demo" ? (
            "Finalizar con datos"
          ) : (
            "Finalizar registro"
          )}
        </Button>
      }
    >
      <section className="mx-auto w-full max-w-sm px-5 pt-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <p className="pt-2 text-sm font-medium text-orange-600">Paso 3 de 3</p>
          <h1 className="text-2xl font-bold leading-tight text-foreground">
            Completa tu registro
          </h1>
          <p className="mx-auto max-w-[18rem] text-sm leading-5 text-muted-foreground">
            Puedes entrar con datos listos para probar {isWaterMode ? "repartos" : "ventas"} o empezar sin información inicial.
          </p>
        </div>

        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Datos iniciales">
          {options.map((option) => {
            const Icon = option.icon;
            const selected = selectedOption === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`onboarding-data-${option.value}`}
                onClick={() => setSelectedOption(option.value)}
                disabled={isLoading}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
                  selected
                    ? "border-orange-400 bg-orange-50 shadow-sm dark:border-orange-500/70 dark:bg-orange-500/12"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-[#151821] dark:hover:border-white/20 dark:hover:bg-white/[0.08]",
                  isLoading && "cursor-not-allowed opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    selected
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/18 dark:text-orange-200"
                      : "bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-300"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span
                    className={cn(
                      "block text-base font-semibold",
                      selected ? "text-foreground" : "text-foreground"
                    )}
                  >
                    {option.title}
                  </span>
                  <span
                    className={cn(
                      "block text-sm leading-5",
                      selected
                        ? "text-muted-foreground"
                        : "text-muted-foreground dark:text-gray-300"
                    )}
                  >
                    {option.description}
                  </span>
                  <span
                    className={cn(
                      "block text-xs font-medium leading-4",
                      selected
                        ? "text-orange-700"
                        : "text-gray-600 dark:text-gray-300"
                    )}
                  >
                    {option.detail}
                  </span>
                </span>
                <CheckCircle2
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    selected ? "text-orange-500 dark:text-orange-300" : "text-gray-300 dark:text-gray-500"
                  )}
                />
              </button>
            );
          })}
        </div>

        {seedDemoMutation.error && (
          <p className="mt-4 text-center text-sm text-destructive">
            {seedDemoMutation.error instanceof Error
              ? seedDemoMutation.error.message
              : "Error al cargar datos de ejemplo"}
          </p>
        )}
      </section>
    </FormPage>
  );
}

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import {
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  Drumstick,
  Loader2,
  Route,
} from "lucide-react";
import { useCreateBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormPage } from "~/components/layout/form-page";
import { hydrateCurrentBusinessContext } from "~/lib/business-context";
import { cn } from "~/lib/utils";

const createBusinessSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  businessMode: z.enum(["polleria", "agua", "cochera"]),
  ruc: z.string().max(20).optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
});

type CreateBusinessFormData = z.infer<typeof createBusinessSchema>;
type BusinessModeOption = CreateBusinessFormData["businessMode"];

const businessModeOptions: Array<{
  value: BusinessModeOption;
  title: string;
  description: string;
  icon: typeof Drumstick;
}> = [
  {
    value: "polleria",
    title: "Pollería / distribuidora de pollo",
    description: "Ventas por kilos, reparto diario, clientes y cobros.",
    icon: Drumstick,
  },
  {
    value: "agua",
    title: "Reparto de agua",
    description: "Rutas, bidones, recargas y clientes recurrentes.",
    icon: Droplets,
  },
  {
    value: "cochera",
    title: "Cochera / playa de estacionamiento",
    description: "Entradas, salidas, tarifas y cobro por permanencia.",
    icon: CarFront,
  },
];

export default function CreateBusinessPage() {
  const navigate = useNavigate();
  const createBusiness = useCreateBusiness();
  const [showOptional, setShowOptional] = useState(false);

  const form = useForm<CreateBusinessFormData>({
    resolver: zodResolver(createBusinessSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      businessMode: "polleria",
      ruc: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = async (data: CreateBusinessFormData) => {
    try {
      const input = {
        name: data.name,
        ruc: data.ruc || undefined,
        address: data.address || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        businessMode: data.businessMode,
      };

      await createBusiness.mutateAsync(input);
      navigate("/onboarding/data");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear negocio";

      if (message.includes("ya tiene un negocio asociado")) {
        const businessContext = await hydrateCurrentBusinessContext();
        if (businessContext?.businessId) {
          navigate("/onboarding/data");
          return;
        }
      }

      form.setError("root", {
        message,
      });
    }
  };

  return (
    <FormPage
      title=""
      backHref="/"
      maxWidth="sm"
      toolbar={
        <Button
          type="submit"
          form="business-create-form"
          disabled={createBusiness.isPending || !form.formState.isValid}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {createBusiness.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creando negocio...
            </>
          ) : (
            "Crear y continuar"
          )}
        </Button>
      }
    >
      <section className="space-y-6 bg-transparent px-2 pt-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
            <Route className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-orange-600">Paso 2 de 3</p>
            <h1 className="text-2xl font-bold text-foreground">
              ¿Cómo se llama tu negocio?
            </h1>
            <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-5 text-muted-foreground">
              Elige el rubro para preparar la app con las pantallas correctas.
            </p>
          </div>
        </div>

        <FormProvider {...form}>
          <form id="business-create-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <FormInput
                label="Nombre del negocio *"
                placeholder="Ej: Pollería El Sabor"
                error={form.formState.errors.name?.message}
                className="text-lg"
                name="name"
              />

              <div className="space-y-3" role="radiogroup" aria-label="Tipo de negocio">
                <p className="text-sm font-medium text-foreground">Tipo de negocio *</p>
                {businessModeOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = form.watch("businessMode") === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`business-mode-${option.value}`}
                      onClick={() =>
                        form.setValue("businessMode", option.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      disabled={createBusiness.isPending}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
                        selected
                          ? "border-orange-400 bg-card shadow-sm ring-1 ring-orange-400/35"
                          : "border-border bg-card hover:border-orange-300/60 hover:bg-muted/40",
                        createBusiness.isPending && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          selected
                            ? "bg-orange-500 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block text-base font-semibold text-foreground">
                          {option.title}
                        </span>
                        <span className="block text-sm leading-5 text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                      <CheckCircle2
                        className={cn(
                          "mt-0.5 h-5 w-5 shrink-0",
                          selected
                            ? "text-orange-500"
                            : "text-muted-foreground/60"
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showOptional ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Ocultar opcionales
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Agregar RUC, teléfono (opcional)
                    </>
                  )}
                </button>

                {showOptional && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        label="RUC"
                        placeholder="20123456789"
                        error={form.formState.errors.ruc?.message}
                        name="ruc"
                      />
                      <FormInput
                        label="Teléfono"
                        placeholder="987654321"
                        error={form.formState.errors.phone?.message}
                        name="phone"
                      />
                    </div>
                    <FormInput
                      label="Dirección"
                      placeholder="Av. Principal 123"
                      error={form.formState.errors.address?.message}
                      name="address"
                    />
                    <FormInput
                      label="Email del negocio"
                      type="email"
                      placeholder="contacto@tunegocio.com"
                      error={form.formState.errors.email?.message}
                      name="email"
                    />
                  </div>
                )}
              </div>

              {form.formState.errors.root && (
                <p className="text-sm text-destructive text-center">
                  {form.formState.errors.root.message}
                </p>
              )}
            </div>
          </form>
        </FormProvider>
      </section>
    </FormPage>
  );
}

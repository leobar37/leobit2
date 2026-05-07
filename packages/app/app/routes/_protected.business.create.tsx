import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { Car, CheckCircle2, ChevronDown, ChevronUp, Droplets, Loader2, Route, Scale, Truck } from "lucide-react";
import { useCreateBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { FormPage } from "~/components/layout/form-page";
import { MobilePage } from "~/components/mobile/mobile-page";
import { hydrateCurrentBusinessContext } from "~/lib/business-context";
import { cn } from "~/lib/utils";
import type { BusinessModeSlug } from "@avileo/shared";

const createBusinessSchema = z.object({
  businessMode: z.enum(["polleria", "agua", "cochera"]),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  ruc: z.string().max(20).optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
});

type CreateBusinessFormData = z.infer<typeof createBusinessSchema>;

const businessModeOptions: Array<{
  value: BusinessModeSlug;
  title: string;
  description: string;
  detail: string;
  icon: typeof Route;
  tone: string;
}> = [
  {
    value: "polleria",
    title: "Distribuidora de pollo",
    description: "Ventas por peso, tara y reparto con vendedores.",
    detail: "Recomendado para el flujo actual",
    icon: Scale,
    tone: "orange",
  },
  {
    value: "agua",
    title: "Reparto de agua",
    description: "Rutas, bidones, recargas y clientes recurrentes.",
    detail: "Listo para configurar como negocio",
    icon: Droplets,
    tone: "sky",
  },
  {
    value: "cochera",
    title: "Estacionamiento / Cochera",
    description: "Control de ingreso, salida y cobro de vehículos.",
    detail: "Nuevo",
    icon: Car,
    tone: "emerald",
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
      businessMode: "polleria",
      name: "",
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

      const createdBusiness = await createBusiness.mutateAsync(input);
      navigate(createdBusiness.businessMode === "cochera" ? "/config/cochera" : "/onboarding/data");
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

  const selectedBusinessMode = form.watch("businessMode");

  return (
    <FormPage
      title=""
      backHref="/"
      maxWidth="sm"
      toolbar={
        <Button
          type="button"
          onClick={form.handleSubmit(onSubmit)}
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
      <MobilePage.Card variant="flat">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-sm text-orange-600 font-medium mb-1">Paso 2 de 3</p>
            <CardTitle className="text-2xl font-bold text-foreground">
              Configura tu negocio
            </CardTitle>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Elige el tipo de negocio para adaptar ventas, productos y reparto.
            </p>
          </div>
        </CardHeader>

        <FormProvider {...form}>
        <form id="business-create-form" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Tipo de negocio *</p>
              <div className="grid gap-3" role="radiogroup" aria-label="Tipo de negocio">
                {businessModeOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = selectedBusinessMode === option.value;
                  const isWater = option.tone === "sky";
                  const isCochera = option.tone === "emerald";

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`business-mode-${option.value}`}
                      onClick={() => {
                        form.setValue("businessMode", option.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
                        selected
                          ? "border-orange-400 bg-orange-50 shadow-sm dark:border-orange-500/70 dark:bg-orange-500/12"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-[#151821] dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          selected
                            ? isWater
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/18 dark:text-sky-200"
                              : isCochera
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-200"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-500/18 dark:text-orange-200"
                            : "bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-300"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span
                          className={cn(
                            "block text-base font-semibold",
                            selected ? "text-slate-950" : "text-foreground"
                          )}
                        >
                          {option.title}
                        </span>
                        <span
                          className={cn(
                            "block text-sm leading-5",
                            selected ? "text-slate-600" : "text-muted-foreground dark:text-gray-300"
                          )}
                        >
                          {option.description}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            selected
                              ? "bg-white text-orange-700"
                              : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-300"
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
              {form.formState.errors.businessMode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.businessMode.message}
                </p>
              )}
            </div>

            <FormInput
              label="Nombre del negocio *"
              placeholder="Ej: Distribuidora El Sabor"
              error={form.formState.errors.name?.message}
              className="text-lg"
              name="name"
            />

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
          </CardContent>
        </form>
      </FormProvider>
      </MobilePage.Card>
    </FormPage>
  );
}

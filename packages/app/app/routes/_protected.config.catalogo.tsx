// @ts-nocheck - Route file with complex type errors
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { Switch } from "@/components/ui/switch";
import { useBusiness, useUpdateBusiness } from "@/hooks/use-business";
import { FormPage } from "~/components/layout/form-page";

const publicCatalogSchema = z
  .object({
    publicCatalogEnabled: z.boolean(),
    publicCatalogSlug: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9-]+$/)
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.publicCatalogEnabled && !data.publicCatalogSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publicCatalogSlug"],
        message: "Configura una URL pública para activar el catálogo",
      });
    }
  });

type PublicCatalogFormData = z.infer<typeof publicCatalogSchema>;

export default function PublicCatalogConfigPage() {
  const { data: business, isLoading } = useBusiness();
  const updateBusiness = useUpdateBusiness();

  const form = useForm<PublicCatalogFormData>({
    resolver: zodResolver(publicCatalogSchema),
    mode: "onChange",
    defaultValues: {
      publicCatalogEnabled: false,
      publicCatalogSlug: "",
    },
    values: business
      ? {
          publicCatalogEnabled: business.publicCatalogEnabled,
          publicCatalogSlug: business.publicCatalogSlug || "",
        }
      : undefined,
  });

  const publicCatalogSlug = form.watch("publicCatalogSlug");
  const publicCatalogEnabled = form.watch("publicCatalogEnabled");
  const publicCatalogUrl =
    publicCatalogSlug && typeof window !== "undefined"
      ? `${window.location.origin}/venta/${publicCatalogSlug}`
      : "";
  const canOpenPublicCatalog = publicCatalogEnabled && !!publicCatalogUrl;

  const handleCopy = async () => {
    if (!canOpenPublicCatalog) {
      toast.error("Catálogo desactivado", {
        description: "Activa el catálogo y guarda los cambios antes de compartir el enlace.",
      });
      return;
    }
    await navigator.clipboard.writeText(publicCatalogUrl);
    toast.success("Enlace copiado");
  };

  const onSubmit = async (data: PublicCatalogFormData) => {
    if (!business) return;

    try {
      await updateBusiness.mutateAsync({
        id: business.id,
        input: {
          name: business.name,
          ruc: business.ruc || undefined,
          address: business.address || undefined,
          phone: business.phone || undefined,
          email: business.email || undefined,
          usarDistribucion: business.usarDistribucion,
          publicCatalogEnabled: data.publicCatalogEnabled,
          publicCatalogSlug: data.publicCatalogSlug || null,
        },
      });
      toast.success("Catálogo actualizado");
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el catálogo",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <FormPage
      title="Catálogo público"
      backHref="/config"
      icon={Globe2}
      toolbar={
        <Button
          type="submit"
          form="public-catalog-form"
          disabled={updateBusiness.isPending || !form.formState.isValid}
          className="h-14 w-full rounded-xl bg-orange-500 text-lg font-semibold text-white hover:bg-orange-600 disabled:bg-orange-300 disabled:text-white disabled:opacity-100"
        >
          {updateBusiness.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar catálogo"
          )}
        </Button>
      }
    >
      <form
        id="public-catalog-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto max-w-md space-y-5"
      >
        <section className="border-b border-border/60 pb-4 dark:border-white/[0.07]">
          <div
            className={
              publicCatalogEnabled
                ? "mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
            }
          >
            <div className="flex items-start gap-3">
              {publicCatalogEnabled ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {publicCatalogEnabled
                    ? "Catálogo accesible para clientes"
                    : "Catálogo no accesible"}
                </p>
                <p className="mt-1">
                  {publicCatalogEnabled
                    ? "Puedes compartir el enlace público después de guardar cualquier cambio."
                    : "El enlace no funcionará hasta que actives el catálogo y guardes los cambios."}
                </p>
              </div>
            </div>
          </div>

          <Controller
            name="publicCatalogEnabled"
            control={form.control}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                label="Catálogo público"
                description="Permite que tus clientes armen y confirmen pedidos desde un enlace."
              />
            )}
          />
        </section>

        <FormInput
          label="URL pública"
          description="Solo letras, números y guiones. Ejemplo: polleria-leo"
          error={form.formState.errors.publicCatalogSlug?.message}
          register={form.register("publicCatalogSlug")}
        />

        {publicCatalogUrl ? (
          <section className="space-y-3 border-b border-border/60 pb-4 dark:border-white/[0.07]">
            <div className="flex items-start gap-3">
              {publicCatalogEnabled ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {publicCatalogEnabled
                    ? "Enlace activo para clientes"
                    : "Vista previa del enlace"}
                </p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {publicCatalogUrl}
                </p>
                {!publicCatalogEnabled ? (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    Todavía no compartas este enlace: el catálogo está desactivado.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-lg"
                disabled={!canOpenPublicCatalog}
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
              {canOpenPublicCatalog ? (
                <Button
                  type="button"
                  asChild
                  className="h-10 gap-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                >
                  <Link to={`/venta/${publicCatalogSlug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-10 gap-2 rounded-lg"
                  disabled
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir
                </Button>
              )}
            </div>
          </section>
        ) : null}

        {form.formState.errors.root ? (
          <p className="text-center text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        ) : null}
      </form>
    </FormPage>
  );
}

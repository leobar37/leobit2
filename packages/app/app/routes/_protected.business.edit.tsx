import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Route, Camera, Loader2, Settings } from "lucide-react";
import {
  useBusiness,
  useUpdateBusiness,
} from "@/hooks/use-business";
import { useFile } from "~/hooks/use-files";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { Switch } from "@/components/ui/switch";
import { FormPage } from "~/components/layout/form-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWrapperForm, WrapperFormProvider } from "~/hooks/use-wrapper-form";
import { fileField } from "~/lib/forms/media-field-resolvers";
import { CameraGalleryDrawer } from "~/components/ui/camera-gallery-drawer";

const updateBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  ruc: z.string().max(20).optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  usarDistribucion: z.boolean(),
  publicCatalogEnabled: z.boolean(),
  publicCatalogSlug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/).or(z.literal("")),
  logoFileId: z
    .union([
      z.string(),
      z.custom<File>((value) => typeof File !== "undefined" && value instanceof File),
      z.null(),
    ])
    .optional(),
});

type UpdateBusinessFormData = z.infer<typeof updateBusinessSchema>;

export default function EditBusinessPage() {
  const { data: business, isLoading } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const { data: logoFile } = useFile(business?.logoFileId ?? "");
  const [logoDrawerOpen, setLogoDrawerOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const wrapperForm = useWrapperForm<UpdateBusinessFormData>({
    resolver: zodResolver(updateBusinessSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      ruc: "",
      address: "",
      phone: "",
      email: "",
      usarDistribucion: true,
      publicCatalogEnabled: false,
      publicCatalogSlug: "",
      logoFileId: undefined,
    },
    values: business
      ? {
          name: business.name,
          ruc: business.ruc || "",
          address: business.address || "",
          phone: business.phone || "",
          email: business.email || "",
          usarDistribucion: business.usarDistribucion,
          publicCatalogEnabled: business.publicCatalogEnabled,
          publicCatalogSlug: business.publicCatalogSlug || "",
          logoFileId: business.logoFileId ?? undefined,
        }
      : undefined,
    fields: {
      logoFileId: fileField(),
    },
  });

  const logoValue = wrapperForm.watch("logoFileId");

  // Clean up preview URL when logoValue changes from File to string/null
  useState(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  });

  const handleLogoFileSelect = (file: File) => {
    wrapperForm.setValue("logoFileId", file, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

  const handleSubmit = wrapperForm.handleResolvedSubmit(async (data) => {
    if (!business) return;

    try {
      const payload: {
        name: string;
        ruc?: string;
        address?: string;
        phone?: string;
        email?: string;
        usarDistribucion: boolean;
        publicCatalogEnabled: boolean;
        publicCatalogSlug: string | null;
        logoFileId?: string | null;
      } = {
        name: data.name,
        ruc: data.ruc || undefined,
        address: data.address || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        usarDistribucion: data.usarDistribucion,
        publicCatalogEnabled: data.publicCatalogEnabled,
        publicCatalogSlug: data.publicCatalogSlug || null,
      };

      if (typeof data.logoFileId === "string" && data.logoFileId) {
        payload.logoFileId = data.logoFileId;
      }

      await updateBusiness.mutateAsync({
        id: business.id,
        input: payload,
      });
      setLogoPreview(null);
    } catch (error) {
      wrapperForm.setError("root", {
        message: error instanceof Error ? error.message : "Error al actualizar",
      });
    }
  });

  // Resolve logo image URL for display
  const logoImageUrl = logoPreview
    ? logoPreview
    : typeof logoValue === "string" && logoValue
      ? logoFile?.url
      : business?.logoUrl;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
          <CardHeader className="text-center">
            <CardTitle>No tienes un negocio</CardTitle>
            <CardDescription>
              Crea un negocio para comenzar a usar el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Crear negocio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const publicCatalogUrl = business.publicCatalogSlug && typeof window !== "undefined"
    ? `${window.location.origin}/venta/${business.publicCatalogSlug}`
    : "";

  return (
    <>
      <FormPage
        title="Mi Negocio"
        backHref="/config"
        toolbar={
          <Button
            type="submit"
            form="business-edit-form"
            disabled={updateBusiness.isPending || !wrapperForm.formState.isValid}
            className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
          >
            {updateBusiness.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Logo Section */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div
                className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden shadow-lg"
                onClick={() => setLogoDrawerOpen(true)}
              >
                {logoImageUrl ? (
                  <img
                    src={logoImageUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Route className="h-10 w-10 text-white" />
                )}
              </div>
              <button
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-orange-100"
                onClick={() => setLogoDrawerOpen(true)}
                type="button"
              >
                <Camera className="h-4 w-4 text-orange-600" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{business.name}</h2>
              <p className="text-sm text-muted-foreground">
                {business.role === "ADMIN_NEGOCIO" ? "Administrador" : "Vendedor"}
              </p>
            </div>
          </div>

          {/* Form */}
          <WrapperFormProvider form={wrapperForm}>
            <form id="business-edit-form" onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Nombre del negocio"
                placeholder="Ej: Pollería El Sabor"
                error={wrapperForm.formState.errors.name?.message}
                name="name"
              />

              <FormInput
                label="RUC"
                placeholder="20123456789"
                error={wrapperForm.formState.errors.ruc?.message}
                name="ruc"
              />

              <FormInput
                label="Dirección"
                placeholder="Av. Principal 123"
                error={wrapperForm.formState.errors.address?.message}
                name="address"
              />

              <FormInput
                label="Teléfono"
                placeholder="987654321"
                error={wrapperForm.formState.errors.phone?.message}
                name="phone"
              />

              <FormInput
                label="Email"
                type="email"
                placeholder="contacto@tunegocio.com"
                error={wrapperForm.formState.errors.email?.message}
                name="email"
              />

              {/* Settings Section */}
              <div className="pt-4 border-t border-border/60">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">Configuración del Negocio</h3>
                </div>

                <div className="space-y-4">
                  <Switch
                    checked={wrapperForm.watch("usarDistribucion")}
                    onCheckedChange={(checked) =>
                      wrapperForm.setValue("usarDistribucion", checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    label="Usar sistema de distribución"
                    description="Asigna kilos a vendedores diariamente"
                  />

                  <Switch
                    checked={wrapperForm.watch("publicCatalogEnabled")}
                    onCheckedChange={(checked) =>
                      wrapperForm.setValue("publicCatalogEnabled", checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    label="Catálogo público"
                    description="Permite que clientes creen pedidos desde un enlace público"
                  />

                  <FormInput
                    label="URL pública"
                    placeholder="polleria-leo"
                    description="Solo letras, números y guiones"
                    error={wrapperForm.formState.errors.publicCatalogSlug?.message}
                    name="publicCatalogSlug"
                  />

                  {publicCatalogUrl && (
                    <div className="rounded-lg border border-orange-100 bg-orange-50/70 p-3 text-sm text-orange-800">
                      Enlace: <span className="font-semibold">{publicCatalogUrl}</span>
                    </div>
                  )}
                </div>
              </div>

              {wrapperForm.formState.errors.root && (
                <p className="text-sm text-destructive text-center">
                  {wrapperForm.formState.errors.root.message}
                </p>
              )}
            </form>
          </WrapperFormProvider>
        </div>
      </FormPage>

      <CameraGalleryDrawer
        open={logoDrawerOpen}
        onOpenChange={setLogoDrawerOpen}
        onFileSelect={handleLogoFileSelect}
        title="Logo del negocio"
      />
    </>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, Loader2, User, Moon, Sun, Monitor, Download, Check, Smartphone, Share2, X } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { usePWAInstall } from "~/hooks/use-pwa-install";
import { useFile } from "~/hooks/use-files";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormDate } from "@/components/forms/form-date";
import { FormMediaField } from "@/components/forms/form-media-field";
import { useEffect, useState } from "react";
import { MobileSlot, MobilePage } from "~/components/mobile";
import { useTheme } from "~/components/theme";
import { cn } from "~/lib/utils";
import { useWrapperForm, WrapperFormProvider } from "~/hooks/use-wrapper-form";
import { fileField } from "~/lib/forms/media-field-resolvers";
import { CameraGalleryDrawer } from "~/components/ui/camera-gallery-drawer";
import { getErrorMessage } from "~/lib/api-utils";

const profileSchema = z.object({
  dni: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  birthDate: z.string().optional(),
  avatarId: z
    .union([
      z.string(),
      z.custom<File>((value) => typeof File !== "undefined" && value instanceof File),
      z.null(),
    ])
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const themes = [
  { id: "light" as const, name: "Claro", icon: Sun },
  { id: "dark" as const, name: "Oscuro", icon: Moon },
  { id: "system" as const, name: "Sistema", icon: Monitor },
];

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: avatarFile } = useFile(profile?.avatarId ?? "");
  const updateProfile = useUpdateProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const isLoading = profileLoading;
  const { mode, setMode } = useTheme();
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();

  const wrapperForm = useWrapperForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      dni: "",
      phone: "",
      birthDate: "",
      avatarId: undefined,
    },
    values: profile
      ? {
          dni: profile.dni || "",
          phone: profile.phone || "",
          birthDate: profile.birthDate || "",
          avatarId: profile.avatarId ?? undefined,
        }
      : undefined,
    fields: {
      avatarId: fileField(),
    },
  });
  const avatarValue = wrapperForm.watch("avatarId");

  useEffect(() => {
    if (!(avatarValue instanceof File)) {
      setAvatarPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(avatarValue);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarValue]);

  const saveProfile = async (data: ProfileFormData) => {
    setIsUploading(true);
    try {
      const payload: Record<string, string> = {};
      if (data.dni && data.dni.trim()) {
        payload.dni = data.dni.trim();
      }
      if (data.phone && data.phone.trim()) {
        payload.phone = data.phone.trim();
      }
      if (data.birthDate && data.birthDate.trim()) {
        payload.birthDate = data.birthDate.trim();
      }
      if (typeof data.avatarId === "string" && data.avatarId) {
        payload.avatarId = data.avatarId;
      }
      await updateProfile.mutateAsync(payload);
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      toast.error("Error al actualizar el perfil", {
        description: getErrorMessage(error),
      });
      console.error("Error updating profile:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    setAvatarDrawerOpen(true);
  };

  const handleAvatarFileSelect = (file: File) => {
    wrapperForm.setValue("avatarId", file, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleSubmit = wrapperForm.handleSubmit(async (rawData) => {
    setIsUploading(true);
    try {
      const data = await wrapperForm.resolvePayload(rawData);
      await saveProfile(data);
    } catch (error) {
      toast.error("Error al actualizar el perfil", {
        description: getErrorMessage(error),
      });
      console.error("Error updating profile:", error);
      setIsUploading(false);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate font-bold text-lg tracking-tight">Mi Perfil</h1>
      </MobileSlot>

      <MobilePage.Root maxWidth="md" className="space-y-4">
        <div className="space-y-4">
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div
                className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden shadow-lg"
                onClick={handleAvatarClick}
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : avatarPreview || avatarFile?.url ? (
                  <img
                    src={avatarPreview || avatarFile?.url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-white" />
                )}
              </div>
              <button
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-orange-100"
                onClick={handleAvatarClick}
                type="button"
              >
                <Camera className="h-4 w-4 text-orange-600" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile?.name}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div>
            <WrapperFormProvider form={wrapperForm}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormMediaField
                  name="avatarId"
                  label="Avatar"
                />

                <FormInput
                  label="DNI"
                  placeholder="Ingresa tu DNI"
                  error={wrapperForm.formState.errors.dni?.message}
                  {...wrapperForm.register("dni")}
                />

                <FormInput
                  label="Teléfono"
                  placeholder="Ingresa tu teléfono"
                  error={wrapperForm.formState.errors.phone?.message}
                  {...wrapperForm.register("phone")}
                />

                <FormDate
                  name="birthDate"
                  label="Fecha de nacimiento"
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
                  disabled={updateProfile.isPending || isUploading}
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </form>
            </WrapperFormProvider>
          </div>
        </div>

        <section className="space-y-3 border-t border-border/60 pt-5">
          <div>
            <h3 className="text-base font-semibold">Tema</h3>
            <p className="text-sm text-muted-foreground">
              Selecciona tu preferencia de tema visual
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/25 p-1">
            {themes.map((theme) => {
              const Icon = theme.icon;
              const isSelected = mode === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setMode(theme.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "text-orange-500" : "text-muted-foreground"
                    )}
                  />
                  <span>{theme.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 border-t border-border/60 pt-5">
          <div>
            <h3 className="text-base font-semibold">Aplicación</h3>
            <p className="text-sm text-muted-foreground">
              Instala Avileo en tu dispositivo para acceso rápido
            </p>
          </div>
          {isInstalled ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-500/10">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Avileo instalado</p>
                <p className="text-xs text-muted-foreground">La app está en tu pantalla de inicio</p>
              </div>
            </div>
          ) : canInstall ? (
            <button
              type="button"
              onClick={install}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/35"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-500/10">
                {isIOS ? (
                  <Share2 className="h-5 w-5 text-orange-600" />
                ) : (
                  <Download className="h-5 w-5 text-orange-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isIOS ? "Agregar a pantalla de inicio" : "Instalar Avileo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isIOS
                    ? "Toca el botón compartir y selecciona 'Agregar a pantalla de inicio'"
                    : "Agrega la app para acceso sin conexión"}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Avileo Web</p>
                <p className="text-xs text-muted-foreground">Usa tu navegador para acceder a Avileo</p>
              </div>
            </div>
          )}
        </section>
      </MobilePage.Root>

      <CameraGalleryDrawer
        open={avatarDrawerOpen}
        onOpenChange={setAvatarDrawerOpen}
        onFileSelect={handleAvatarFileSelect}
        title="Avatar"
      />
    </>
  );
}

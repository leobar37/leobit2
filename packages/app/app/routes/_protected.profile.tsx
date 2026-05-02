import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, Loader2, User, Moon, Sun, Monitor } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useFile } from "~/hooks/use-files";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormDate } from "@/components/forms/form-date";
import { FormMediaField } from "@/components/forms/form-media-field";
import { useRef, useState } from "react";
import { MobileSlot, MobilePage } from "~/components/mobile";
import { useTheme } from "~/components/theme";
import { cn } from "~/lib/utils";
import { useWrapperForm, WrapperFormProvider } from "~/hooks/use-wrapper-form";
import { fileField } from "~/lib/forms/media-field-resolvers";

const profileSchema = z.object({
  dni: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  birthDate: z.string().optional(),
  avatarId: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const themes = [
  { id: "light" as const, name: "Claro", icon: Sun, color: "text-orange-600", bgColor: "bg-orange-100" },
  { id: "dark" as const, name: "Oscuro", icon: Moon, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  { id: "system" as const, name: "Sistema", icon: Monitor, color: "text-green-600", bgColor: "bg-green-100" },
];

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: avatarFile } = useFile(profile?.avatarId ?? "");
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isLoading = profileLoading;
  const { mode, setMode } = useTheme();

  const wrapperForm = useWrapperForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
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

  const onSubmit = async (data: ProfileFormData) => {
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
      if (data.avatarId) {
        payload.avatarId = data.avatarId;
      }
      await updateProfile.mutateAsync(payload);
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      toast.error("Error al actualizar el perfil");
      console.error("Error updating profile:", error);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    wrapperForm.setValue("avatarId", file as unknown as string);
  };

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
                ) : avatarFile?.url ? (
                  <img
                    src={avatarFile.url}
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile?.name}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div>
            <WrapperFormProvider form={wrapperForm}>
              <form onSubmit={wrapperForm.handleResolvedSubmit(onSubmit)} className="space-y-4">
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
                  disabled={updateProfile.isPending || !wrapperForm.formState.isValid}
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

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Tema</h3>
            <p className="text-sm text-muted-foreground">
              Selecciona tu preferencia de tema visual
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((theme) => {
              const Icon = theme.icon;
              const isSelected = mode === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setMode(theme.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    isSelected
                      ? "border-orange-200 bg-orange-50"
                      : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", theme.bgColor)}>
                    <Icon className={cn("h-5 w-5", theme.color)} />
                  </div>
                  <span className="text-sm font-medium">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </MobilePage.Root>
    </>
  );
}

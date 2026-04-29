import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, Loader2, User, Moon, Sun, Monitor } from "lucide-react";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/hooks/use-profile";
import { useFile } from "~/hooks/use-files";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { FormDate } from "@/components/forms/form-date";
import { useRef, useState } from "react";
import { MobileSlot, MobilePage } from "~/components/mobile";
import { useTheme } from "~/components/theme";
import { cn } from "~/lib/utils";

const profileSchema = z.object({
  dni: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  birthDate: z.string().optional(),
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
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isLoading = profileLoading;
  const { mode, setMode } = useTheme();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      dni: "",
      phone: "",
      birthDate: "",
    },
    values: profile
      ? {
          dni: profile.dni || "",
          phone: profile.phone || "",
          birthDate: profile.birthDate || "",
        }
      : undefined,
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

    setIsUploading(true);
    try {
      await uploadAvatar.mutateAsync(file);
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setIsUploading(false);
    }
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
        <MobilePage.Card variant="flat">
          <CardHeader className="text-center">
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
            <CardTitle className="mt-4">{profile?.name}</CardTitle>
            <CardDescription>{profile?.email}</CardDescription>
          </CardHeader>

          <CardContent>
            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormInput
                  label="DNI"
                  placeholder="Ingresa tu DNI"
                  error={form.formState.errors.dni?.message}
                  {...form.register("dni")}
                />

                <FormInput
                  label="Teléfono"
                  placeholder="Ingresa tu teléfono"
                  error={form.formState.errors.phone?.message}
                  {...form.register("phone")}
                />

                <FormDate
                  name="birthDate"
                  label="Fecha de nacimiento"
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
                  disabled={updateProfile.isPending || !form.formState.isValid}
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
            </FormProvider>
          </CardContent>
        </MobilePage.Card>

        <MobilePage.Card variant="soft">
          <CardHeader>
            <CardTitle className="text-lg">Tema</CardTitle>
            <CardDescription>
              Selecciona tu preferencia de tema visual
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </MobilePage.Card>
      </MobilePage.Root>
    </>
  );
}

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, Loader2, User } from "lucide-react";
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
import { useSetLayout } from "~/components/layout/app-layout";
import { DatabaseResetButton } from "~/components/sync/database-reset-button";

const profileSchema = z.object({
  dni: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  birthDate: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: avatarFile } = useFile(profile?.avatarId ?? "");
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isLoading = profileLoading;

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

  useSetLayout({
    title: "Mi Perfil",
    showBottomNav: true,
    showBackButton: true,
    backHref: "/config",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="py-4">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
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
          </Card>

          {/* Database Reset Section */}
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">Datos locales</CardTitle>
              <CardDescription>
                Administra los datos almacenados localmente en este dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DatabaseResetButton />
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { ArrowLeft, Camera, Loader2, User } from "lucide-react";
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
import { useRef, useState } from "react";

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
      await updateProfile.mutateAsync(data);
    } catch (error) {
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Mi Perfil</span>
        </div>
      </header>

      <main className="p-4 pb-24">
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

                <FormInput
                  label="Fecha de nacimiento"
                  type="date"
                  error={form.formState.errors.birthDate?.message}
                  {...form.register("birthDate")}
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
                  disabled={updateProfile.isPending}
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

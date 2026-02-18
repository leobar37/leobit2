import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { ArrowLeft, CheckCircle, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormPassword } from "@/components/forms/form-password";
import { useAuth } from "~/hooks/use-auth";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "~/lib/schemas";

export default function SecurityPage() {
  const { changePassword } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    try {
      setError(null);
      setSuccess(false);

      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      setSuccess(true);
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cambiar la contraseña"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Seguridad</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="mt-4">Cambiar contraseña</CardTitle>
              <CardDescription>
                Actualiza tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>

            <CardContent>
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Contraseña actualizada
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Tu contraseña se ha cambiado exitosamente.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormPassword
                  label="Contraseña actual"
                  placeholder="Ingresa tu contraseña actual"
                  error={form.formState.errors.currentPassword?.message}
                  {...form.register("currentPassword")}
                />

                <FormPassword
                  label="Nueva contraseña"
                  placeholder="Ingresa tu nueva contraseña"
                  error={form.formState.errors.newPassword?.message}
                  {...form.register("newPassword")}
                />

                <FormPassword
                  label="Confirmar nueva contraseña"
                  placeholder="Repite tu nueva contraseña"
                  error={form.formState.errors.confirmPassword?.message}
                  {...form.register("confirmPassword")}
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Cambiar contraseña"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Consejos de seguridad
                  </p>
                  <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Usa al menos 8 caracteres</li>
                    <li>Combina letras, números y símbolos</li>
                    <li>No reutilices contraseñas de otros sitios</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

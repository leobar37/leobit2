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
import { MobileSlot, MobilePage } from "~/components/mobile";

export default function SecurityPage() {
  const { changePassword } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
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
    <>
      <MobileSlot name="header:left" priority={10}>
        <Link
          to="/config"
          className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5 pointer-events-none" />
        </Link>
      </MobileSlot>
      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate font-bold text-lg tracking-tight">Seguridad</h1>
      </MobileSlot>

      <MobilePage.Root maxWidth="md" className="space-y-4">
        <MobilePage.Card variant="flat">
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
                  disabled={form.formState.isSubmitting || !form.formState.isValid}
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
          </MobilePage.Card>
      </MobilePage.Root>
    </>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { Store, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { FormPassword } from "@/components/forms/form-password";
import { DEV_CREDENTIALS, isDevelopment } from "@/lib/dev-credentials";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: isDevelopment() ? DEV_CREDENTIALS.email : "",
      password: isDevelopment() ? DEV_CREDENTIALS.password : "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al iniciar sesión",
      });
    }
  };

  return (
    <div className="app-shell flex min-h-[100svh] items-center justify-center px-4 py-6 sm:p-6">
      <Card className="shell-card w-full max-w-md rounded-[32px] border-white/70 shadow-[0_24px_60px_rgba(15,23,42,0.08),0_8px_22px_rgba(249,115,22,0.08)]">
        <CardHeader className="space-y-5 px-5 pb-5 pt-7 text-center sm:px-6 sm:pt-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-[0_18px_40px_rgba(249,115,22,0.28)]">
            <Store className="h-9 w-9 text-white" />
          </div>
          <div className="space-y-3">
            <CardTitle className="text-4xl font-bold tracking-[-0.03em] text-foreground">
              Bienvenido
            </CardTitle>
            <CardDescription className="mx-auto max-w-[18rem] text-[15px] leading-6 text-muted-foreground sm:text-base">
              Ingresa tus credenciales para continuar
            </CardDescription>
            {isDevelopment() && (
              <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-100/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm">
                Modo desarrollo
              </span>
            )}
          </div>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="px-5 pb-2 sm:px-6">
            <div className="space-y-4 rounded-[28px] border border-white/75 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] sm:p-5">
              <FormInput
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                error={form.formState.errors.email?.message}
                {...form.register("email")}
              />

              <FormPassword
                label="Contraseña"
                placeholder="••••••••"
                error={form.formState.errors.password?.message}
                {...form.register("password")}
              />

              {form.formState.errors.root && (
                <p className="text-center text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 px-5 pb-6 pt-5 sm:px-6 sm:pb-7">
            <Button
              type="submit"
              className="h-14 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-orange-600 text-base font-semibold text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)] transition-all duration-200 hover:from-orange-600 hover:to-orange-700"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>

          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

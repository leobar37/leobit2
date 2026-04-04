import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Navigate, Link } from "react-router";
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
  const { user, isLoading, login } = useAuth();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: isDevelopment() ? DEV_CREDENTIALS.email : "",
      password: isDevelopment() ? DEV_CREDENTIALS.password : "",
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/sync" replace />;
  }

  const onSubmit = async (data: LoginInput) => {
    try {
      const result = await login(data.email, data.password);
      if (result.needsRedirect) {
        navigate(result.redirectTo);
      } else {
        navigate("/sync");
      }
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al iniciar sesión",
      });
    }
  };

  return (
    <div className="app-shell flex min-h-[100svh] items-center px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-sm">
        <Card className="shell-card-flat w-full overflow-hidden rounded-[28px] border-stone-200/90">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300" />

          <CardHeader className="space-y-4 px-5 pb-2 pt-5 sm:px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-500 shadow-[0_10px_24px_rgba(249,115,22,0.18)]">
              <Store className="h-7 w-7 text-white" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-700">Avileo</p>
              <CardTitle className="text-[2rem] font-bold tracking-[-0.04em] text-foreground">
                Bienvenido
              </CardTitle>
              <CardDescription className="max-w-[17rem] text-sm leading-6 text-muted-foreground">
                Ingresa tus credenciales para continuar.
              </CardDescription>
              {isDevelopment() && (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                  Modo desarrollo
                </span>
              )}
            </div>
          </CardHeader>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-3 px-5 pb-2 sm:px-6">
                <FormInput
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@email.com"
                  error={form.formState.errors.email?.message}
                  className="h-12 rounded-[18px] border-stone-200/90 bg-white px-4 shadow-none focus-visible:ring-orange-200"
                  {...form.register("email")}
                />

                <FormPassword
                  label="Contraseña"
                  placeholder="........"
                  error={form.formState.errors.password?.message}
                  className="h-12 rounded-[18px] border-stone-200/90 bg-white px-4 pr-12 shadow-none focus-visible:ring-orange-200"
                  {...form.register("password")}
                />

                {form.formState.errors.root && (
                  <p className="text-center text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                <Button
                  type="submit"
                  className="h-12 w-full rounded-[18px] bg-orange-500 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
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

                <p className="text-center text-sm text-muted-foreground">
                  ¿No tienes cuenta?{" "}
                  <Link
                    to="/register"
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Regístrate
                  </Link>
                </p>
              </CardFooter>
            </form>
          </FormProvider>
        </Card>
      </div>
    </div>
  );
}

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Navigate } from "react-router";
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
      await login(data.email, data.password);
      // Redirect to sync page to ensure data is loaded before showing dashboard
      navigate("/sync");
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al iniciar sesión",
      });
    }
  };

  return (
    <div className="app-shell flex min-h-[100svh] items-center justify-center px-4 py-6 sm:px-6">
      <Card className="shell-card-flat w-full max-w-md rounded-[24px] border-stone-200/90">
        <CardHeader className="space-y-4 px-5 pb-4 pt-6 text-center sm:px-6 sm:pt-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 shadow-[0_8px_18px_rgba(249,115,22,0.16)]">
            <Store className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-2.5">
            <CardTitle className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-[2.25rem]">
              Bienvenido
            </CardTitle>
            <CardDescription className="mx-auto max-w-[18rem] text-sm leading-6 text-muted-foreground sm:text-[15px]">
              Ingresa tus credenciales para continuar
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
          <CardContent className="space-y-4 px-5 pb-2 sm:px-6">
            <FormInput
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              error={form.formState.errors.email?.message}
              className="h-14 rounded-2xl border-stone-200/90 bg-white px-4 shadow-none focus-visible:ring-orange-200"
              {...form.register("email")}
            />

            <FormPassword
              label="Contraseña"
              placeholder="••••••••"
              error={form.formState.errors.password?.message}
              className="h-14 rounded-2xl border-stone-200/90 bg-white px-4 pr-12 shadow-none focus-visible:ring-orange-200"
              {...form.register("password")}
            />

            {form.formState.errors.root && (
              <p className="text-center text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 px-5 pb-6 pt-5 sm:px-6 sm:pb-6">
            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-orange-500 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
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
        </FormProvider>
      </Card>
    </div>
  );
}

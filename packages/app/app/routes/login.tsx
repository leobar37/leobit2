import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Navigate, Link } from "react-router";
import { Route, Loader2, AlertTriangle, ShieldAlert, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { useAuth } from "@/hooks/use-auth";
import { useLoginHealth } from "@/hooks/use-login-health";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { FormInput } from "@/components/forms/form-input";
import { FormPassword } from "@/components/forms/form-password";
import { DEV_CREDENTIALS, isDevelopment } from "@/lib/dev-credentials";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, isLoading, login } = useAuth();
  const health = useLoginHealth();

  // Fallback timeout - if isLoading persists for more than 10s, assume stuck and show login
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    console.log("[DEBUG LoginPage] Loading timeout effect - isLoading:", isLoading);
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log("[DEBUG LoginPage] Loading timeout triggered!");
        setLoadingTimeout(true);
      }, 10000);
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  console.log("[DEBUG LoginPage] Render - isLoading:", isLoading, "user:", user, "healthStatus:", health.status, "loadingTimeout:", loadingTimeout);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: isDevelopment() ? DEV_CREDENTIALS.email : "",
      password: isDevelopment() ? DEV_CREDENTIALS.password : "",
    },
  });

  // Show loading only if: isLoading AND not timed out yet
  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // If timed out or not loading, proceed to render login form (even if isLoading is true after timeout)
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
    <div className="app-shell flex min-h-[100svh] items-center sm:px-6 sm:py-8">
      <div className="mx-auto w-full sm:max-w-sm">
        <Card className="shell-card-flat w-full overflow-hidden sm:rounded-[28px] border-stone-200/90 min-h-[100svh] sm:min-h-0">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300" />

          <CardHeader className="space-y-4 px-4 pb-2 pt-6 sm:px-6 sm:pt-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-500 shadow-[0_10px_24px_rgba(249,115,22,0.18)]">
              <Route className="h-7 w-7 text-white" />
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
              <CardContent className="space-y-3 px-4 pb-2 sm:px-6">
                <FormInput
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@email.com"
                  error={form.formState.errors.email?.message}
                  className="h-12 rounded-[18px] border-stone-200/90 bg-white px-4 shadow-none focus-visible:ring-orange-200"
                  name="email"
                  autoComplete="email"
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

              <CardFooter className="flex flex-col gap-3 px-4 pb-6 pt-4 sm:px-6 sm:pb-6">
                <Button
                  type="submit"
                  className="h-12 w-full rounded-[18px] bg-orange-500 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={form.formState.isSubmitting || !form.formState.isValid || !health.canLogin}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : !health.canLogin ? (
                    <>
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Requiere reparación
                    </>
                  ) : (
                    "Iniciar sesión"
                  )}
                </Button>

                {health.status === "warning" && health.warningMessage && (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{health.warningMessage}</span>
                  </div>
                )}

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

      {/* Health Check Drawer */}
      <Drawer open={health.status === "critical"}>
        <DrawerContent className="px-6 pb-8 pt-4">
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <DrawerTitle>Problema detectado</DrawerTitle>
            </div>
            <DrawerDescription className="pt-2">
              Se detectaron problemas con los datos locales que podrían afectar el funcionamiento de la aplicación.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 py-4">
            {health.result?.issues.map((issue, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  issue.severity === "critical"
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 ${
                      issue.severity === "critical" ? "text-red-600" : "text-amber-600"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                    {issue.details && (
                      <p className="mt-1 text-xs text-gray-600">{issue.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DrawerFooter className="flex-col gap-2 px-0">
            <Button
              onClick={health.repair}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reparar y continuar
            </Button>
            <Button
              variant="outline"
              onClick={health.ignore}
              className="w-full"
            >
              Ignorar y continuar (riesgo)
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

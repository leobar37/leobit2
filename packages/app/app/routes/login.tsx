import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Navigate, Link, useSearchParams } from "react-router";
import { Route, Loader2, AlertTriangle, ShieldAlert, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { useAuth } from "@/hooks/use-auth";
import { useLoginHealth } from "@/hooks/use-login-health";
import { Button } from "@/components/ui/button";
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
import { getStoredAuthToken } from "@/lib/session-storage";
import { DEV_CREDENTIALS, isDevelopment } from "@/lib/dev-credentials";
import {
  MobileShell,
  MobilePage,
  MobileSlotProvider,
} from "~/components/mobile";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading, login } = useAuth();
  const health = useLoginHealth();

  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: searchParams.get("email") || (isDevelopment() ? DEV_CREDENTIALS.email : ""),
      password: isDevelopment() ? DEV_CREDENTIALS.password : "",
    },
  });

  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasToken = !!getStoredAuthToken();

  if (user && hasToken) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginInput) => {
    try {
      const result = await login(data.email, data.password);
      if (result.needsRedirect) {
        navigate(result.redirectTo);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al iniciar sesión",
      });
    }
  };

  return (
    <MobileSlotProvider>
      <MobileShell.Root variant="public">
        <MobileShell.Content className="flex items-start justify-center sm:items-center">
          <MobilePage.Root maxWidth="sm" className="w-full">
            <div className="min-h-[100svh] px-4 pb-8 pt-6 sm:min-h-0 sm:px-6 sm:py-8">
              <div className="space-y-6 sm:space-y-8">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary shadow-lg sm:h-14 sm:w-14 sm:rounded-[20px]">
                    <Route className="h-6 w-6 text-primary-foreground sm:h-7 sm:w-7" />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-sm font-medium text-primary">Avileo</p>
                    <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-foreground sm:text-[2rem]">
                      Bienvenido
                    </h1>
                    <p className="max-w-[19rem] text-sm leading-5 text-muted-foreground sm:max-w-[17rem] sm:leading-6">
                      Ingresa tus credenciales para continuar.
                    </p>
                    {isDevelopment() && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                        Modo desarrollo
                      </span>
                    )}
                  </div>
                </div>

                <FormProvider {...form}>
                  <form
                    id="login-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormInput
                      label="Correo electrónico"
                      type="email"
                      placeholder="tu@email.com"
                      error={form.formState.errors.email?.message}
                      className="h-12 rounded-[18px] px-4 shadow-none"
                      name="email"
                      autoComplete="email"
                    />

                    <FormPassword
                      label="Contraseña"
                      placeholder="........"
                      error={form.formState.errors.password?.message}
                      className="h-12 rounded-[18px] px-4 pr-12 shadow-none"
                      {...form.register("password")}
                    />

                    {form.formState.errors.root && (
                      <p className="text-center text-sm text-destructive">
                        {form.formState.errors.root.message}
                      </p>
                    )}

                    <Button
                      type="submit"
                      form="login-form"
                      className="h-12 w-full rounded-[18px] bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="text-primary hover:text-primary/90 font-medium"
                      >
                        Regístrate
                      </Link>
                    </p>
                  </form>
                </FormProvider>
              </div>
            </div>
          </MobilePage.Root>
        </MobileShell.Content>

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
      </MobileShell.Root>
    </MobileSlotProvider>
  );
}

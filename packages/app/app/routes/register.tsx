import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Navigate, Link, useSearchParams } from "react-router";
import { Route, Loader2, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
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
import { api } from "~/lib/api-client";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("token");
  const { user, isLoading, register } = useAuth();

  const { data: invitationData, isLoading: isLoadingInvitation } = useQuery({
    queryKey: ["invitation", invitationToken],
    queryFn: async () => {
      if (!invitationToken) return null;
      const { data, error } = await api.public.invitations({ token: invitationToken }).get();
      if (error) throw new Error("Token inválido");
      return data;
    },
    enabled: !!invitationToken,
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!invitationToken) return null;
      const { data, error } = await api.public.invitations.accept.post({ token: invitationToken });
      if (error) throw new Error(String(error.value));
      return data;
    },
  });

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
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

  const onSubmit = async (data: RegisterInput) => {
    try {
      const result = await register({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      // If there's an invitation token, accept it before checking business redirect.
      // This creates the business association on the backend so hydrateCurrentBusinessId
      // will return the invited business (not null).
      if (invitationToken) {
        try {
          await acceptInvitationMutation.mutateAsync();
          // Re-hydrate business ID after accepting invitation (backend created the association)
          const { data: businessData } = await api.businesses.me.get();
          if (businessData?.success && businessData?.data?.id) {
            navigate("/dashboard");
            return;
          }
        } catch (error) {
          console.error("Failed to accept invitation:", error);
          // Show warning but allow user to continue (they may need to create a business)
          form.setError("root", {
            message: "La cuenta se creó pero no se pudo aceptar la invitación. Puedes contactar al administrador del negocio.",
          });
          return;
        }
      }

      if (result.needsRedirect) {
        navigate(result.redirectTo);
      } else {
        navigate("/sync");
      }
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al crear la cuenta",
      });
    }
  };

  const isInvitationInvalid = invitationToken && !isLoadingInvitation && !invitationData;
  const hasValidInvitation = invitationData?.data?.name;

  return (
    <div className="app-shell flex min-h-[100svh] items-center px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-sm">
        <Card className="shell-card-flat w-full overflow-hidden rounded-[28px] border-stone-200/90">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300" />

          <CardHeader className="space-y-4 px-5 pb-2 pt-5 sm:px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-500 shadow-[0_10px_24px_rgba(249,115,22,0.18)]">
              <Route className="h-7 w-7 text-white" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-700">Avileo</p>
              <CardTitle className="text-[2rem] font-bold tracking-[-0.04em] text-foreground">
                {hasValidInvitation ? "Unirme a un negocio" : "Crear cuenta"}
              </CardTitle>
              <CardDescription className="max-w-[17rem] text-sm leading-6 text-muted-foreground">
                {hasValidInvitation
                  ? `Has sido invitado a unirte a un negocio. Crea tu cuenta para aceptar la invitación.`
                  : "Regístrate para empezar a gestionar tu negocio."}
              </CardDescription>
            </div>
          </CardHeader>

          {isInvitationInvalid && (
            <div className="px-5 sm:px-6 pb-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Invitación no válida</p>
                  <p className="text-amber-700">El enlace ha expirado o ya fue usado. Puedes crear una cuenta individual.</p>
                </div>
              </div>
            </div>
          )}

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-3 px-5 pb-2 sm:px-6">
                <FormInput
                  label="Nombre completo"
                  placeholder="Ej: Juan Pérez"
                  error={form.formState.errors.name?.message}
                  className="h-12 rounded-[18px] border-stone-200/90 bg-white px-4 shadow-none focus-visible:ring-orange-200"
                  name="name"
                />

                <FormInput
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@email.com"
                  error={form.formState.errors.email?.message}
                  className="h-12 rounded-[18px] border-stone-200/90 bg-white px-4 shadow-none focus-visible:ring-orange-200"
                  autoComplete="email"
                  name="email"
                />

                <FormPassword
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  error={form.formState.errors.password?.message}
                  className="h-12 rounded-[18px] border-stone-200/90 bg-white px-4 pr-12 shadow-none focus-visible:ring-orange-200"
                  {...form.register("password")}
                />

                <FormPassword
                  label="Confirmar contraseña"
                  placeholder="Repite la contraseña"
                  error={form.formState.errors.confirmPassword?.message}
                  className="h-12 rounded-[18px] border-stone-200/90 bg-white px-4 pr-12 shadow-none focus-visible:ring-orange-200"
                  {...form.register("confirmPassword")}
                />

                {form.formState.errors.root && (
                  <p data-testid="register-error" className="text-center text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                <Button
                  type="submit"
                  data-testid="register-submit"
                  className="h-12 w-full rounded-[18px] bg-orange-500 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
                  disabled={form.formState.isSubmitting || !form.formState.isValid}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : hasValidInvitation ? (
                    "Crear cuenta y unirme"
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    to="/login"
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Inicia sesión
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

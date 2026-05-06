import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Navigate, Link, useSearchParams } from "react-router";
import { Route, Loader2, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormPassword } from "@/components/forms/form-password";
import { api } from "~/lib/api-client";
import {
  MobileShell,
  MobilePage,
  MobileFixedFooter,
  MobileSlotProvider,
} from "~/components/mobile";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("token");
  const { user, isLoading, register } = useAuth();
  const [showLoginRecovery, setShowLoginRecovery] = useState(false);

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: RegisterInput) => {
    try {
      setShowLoginRecovery(false);

      const result = await Promise.race([
        register({
          email: data.email,
          password: data.password,
          name: data.name,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("REGISTER_TIMEOUT_RECOVERY")), 12000)
        ),
      ]);

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
        navigate("/dashboard");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear la cuenta";
      const shouldOfferLoginRecovery =
        message.includes("REGISTER_TIMEOUT_RECOVERY")
        || message.includes("AUTH_TIMEOUT")
        || message.toLowerCase().includes("timed out");

      if (shouldOfferLoginRecovery) {
        setShowLoginRecovery(true);
      }

      form.setError("root", {
        message: shouldOfferLoginRecovery
          ? "La creación de cuenta está tardando más de lo normal. Si tu cuenta sí se creó, puedes continuar iniciando sesión con este mismo correo."
          : message,
      });
    }
  };

  const isInvitationInvalid = invitationToken && !isLoadingInvitation && !invitationData;
  const hasValidInvitation = invitationData?.data?.name;

  return (
    <MobileSlotProvider>
      <MobileShell.Root variant="public">
        <MobileShell.Content className="flex items-start justify-center sm:items-center">
          <MobilePage.Root maxWidth="sm" className="w-full">
            <MobilePage.Card className="w-full overflow-hidden rounded-none border-0 bg-transparent shadow-none">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-orange-400 to-amber-300" />

              <div className="space-y-3 px-5 pb-2 pt-4 sm:space-y-4 sm:px-6 sm:pt-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary shadow-lg sm:h-14 sm:w-14 sm:rounded-[20px]">
                  <Route className="h-6 w-6 text-primary-foreground sm:h-7 sm:w-7" />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <p className="text-sm font-medium text-primary">Avileo</p>
                  <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-foreground sm:text-[2rem]">
                    {hasValidInvitation ? "Unirme a un negocio" : "Crear cuenta"}
                  </h1>
                  <p className="max-w-[19rem] text-sm leading-5 text-muted-foreground sm:max-w-[17rem] sm:leading-6">
                    {hasValidInvitation
                      ? `Has sido invitado a unirte a un negocio. Crea tu cuenta para aceptar la invitación.`
                      : "Regístrate para empezar a gestionar tu negocio."}
                  </p>
                </div>
              </div>

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
                <form id="register-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <div
                    className="space-y-3 px-5 pb-2 sm:px-6"
                    style={{
                      paddingBottom:
                        "calc(var(--shell-public-footer-offset, 0px) + var(--shell-safe-area-bottom, env(safe-area-inset-bottom)))",
                    }}
                  >
                    <FormInput
                      label="Nombre completo"
                      placeholder="Ej: Juan Pérez"
                      error={form.formState.errors.name?.message}
                      className="h-12 rounded-[18px] px-4 shadow-none"
                      name="name"
                    />

                    <FormInput
                      label="Correo electrónico"
                      type="email"
                      placeholder="tu@email.com"
                      error={form.formState.errors.email?.message}
                      className="h-12 rounded-[18px] px-4 shadow-none"
                      autoComplete="email"
                      name="email"
                    />

                    <FormPassword
                      label="Contraseña"
                      placeholder="Mínimo 8 caracteres"
                      error={form.formState.errors.password?.message}
                      className="h-12 rounded-[18px] px-4 pr-12 shadow-none"
                      {...form.register("password")}
                    />

                    <FormPassword
                      label="Confirmar contraseña"
                      placeholder="Repite la contraseña"
                      error={form.formState.errors.confirmPassword?.message}
                      className="h-12 rounded-[18px] px-4 pr-12 shadow-none"
                      {...form.register("confirmPassword")}
                    />

                    {form.formState.errors.root && (
                      <div className="space-y-3">
                        <p data-testid="register-error" className="text-center text-sm text-destructive">
                          {form.formState.errors.root.message}
                        </p>
                        {showLoginRecovery ? (
                          <Button
                            asChild
                            type="button"
                            variant="outline"
                            className="h-11 w-full rounded-[18px]"
                          >
                            <Link to={`/login?email=${encodeURIComponent(form.getValues("email"))}`}>
                              Ir a iniciar sesión
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </form>
              </FormProvider>
            </MobilePage.Card>
          </MobilePage.Root>
        </MobileShell.Content>

        <MobileFixedFooter>
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              form="register-form"
              data-testid="register-submit"
              className="h-12 w-full rounded-[18px] bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
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
                className="text-primary hover:text-primary/90 font-medium"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </MobileFixedFooter>
      </MobileShell.Root>
    </MobileSlotProvider>
  );
}

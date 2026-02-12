import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Store, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
import { useAuth } from "@/hooks/use-auth";
import { useValidateInvitation, useAcceptInvitation } from "@/hooks/use-invitation-public";
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
import { useEffect } from "react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("invitation");
  const { register: registerUser } = useAuth();
  
  const { data: invitation, isLoading: isLoadingInvitation } = useValidateInvitation(
    invitationToken || ""
  );
  const acceptInvitation = useAcceptInvitation();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  });

  useEffect(() => {
    if (invitation?.email) {
      form.setValue("email", invitation.email);
    }
  }, [invitation, form]);

  const onSubmit = async (data: RegisterInput) => {
    try {
      const result = await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (invitationToken && result?.user?.id) {
        try {
          await acceptInvitation.mutateAsync({
            token: invitationToken,
            userId: result.user.id,
          });
        } catch (error) {
          console.error("Error accepting invitation:", error);
        }
      }

      navigate("/dashboard");
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al registrar",
      });
    }
  };

  if (invitationToken && isLoadingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
            <p className="mt-4 text-muted-foreground">Verificando invitación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Store className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {invitation ? "Únete al equipo" : "Crear cuenta"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {invitation
                ? `Has sido invitado a unirte como ${invitation.name}`
                : "Regístrate para comenzar a usar Avileo"}
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {invitation && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-800">Invitación válida</p>
                  <p className="text-green-600">
                    {invitation.salesPoint
                      ? `Punto de venta: ${invitation.salesPoint}`
                      : "Vendedor"}
                  </p>
                </div>
              </div>
            )}

            <FormInput
              label="Nombre completo"
              placeholder="Tu nombre"
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />

            <div className="relative">
              <FormInput
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                disabled={!!invitation}
                error={form.formState.errors.email?.message}
                {...form.register("email")}
              />
              {invitation && (
                <Mail className="absolute right-3 top-8 h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <FormPassword
              label="Contraseña"
              placeholder="••••••••"
              error={form.formState.errors.password?.message}
              {...form.register("password")}
            />

            <FormPassword
              label="Confirmar contraseña"
              placeholder="••••••••"
              error={form.formState.errors.confirmPassword?.message}
              {...form.register("confirmPassword")}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive text-center">
                {form.formState.errors.root.message}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
              disabled={form.formState.isSubmitting || acceptInvitation.isPending}
            >
              {form.formState.isSubmitting || acceptInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {invitation ? "Uniéndote al equipo..." : "Creando cuenta..."}
                </>
              ) : (
                invitation ? "Crear cuenta y unirme" : "Crear cuenta"
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              ¿Ya tienes una cuenta?{" "}
              <Link
                to="/login"
                className="text-orange-600 hover:text-orange-700 font-medium underline-offset-4 hover:underline"
              >
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

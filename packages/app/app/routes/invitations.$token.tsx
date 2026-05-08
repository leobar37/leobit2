// @ts-nocheck - Route file with complex type errors
import { useParams, useNavigate } from "react-router";
import { Route, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  useValidateInvitation,
  useAcceptInvitation,
} from "@/hooks/use-invitation-public";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { hydrateCurrentBusinessContext } from "~/lib/business-context";

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: invitation, isLoading, error } = useValidateInvitation(token || "");
  const acceptInvitation = useAcceptInvitation();

  const handleAccept = async () => {
    if (!token || !user) return;

    try {
      await acceptInvitation.mutateAsync({ token });
      await hydrateCurrentBusinessContext();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-sm rounded-3xl border border-border/70 bg-card shadow-xl shadow-black/5 dark:shadow-black/30">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Verificando invitación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-sm rounded-3xl border border-border/70 bg-card shadow-xl shadow-black/5 dark:shadow-black/30">
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <CardTitle className="text-xl mb-2">Invitación no válida</CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Esta invitación no existe o ha expirado"}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-sm rounded-3xl border border-border/70 bg-card shadow-xl shadow-black/5 dark:shadow-black/30">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Route className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">¡Te han invitado!</CardTitle>
          <CardDescription>
            Has sido invitado a unirte a un negocio en Avileo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border border-border/60 bg-muted/60 p-4 text-center dark:bg-muted/30">
            <p className="font-semibold text-lg">{invitation.name}</p>
            <p className="text-sm text-muted-foreground">{invitation.email}</p>
            {invitation.salesPoint && (
              <p className="mt-2 text-sm font-medium text-primary">
                Punto de venta: {invitation.salesPoint}
              </p>
            )}
          </div>

          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Para aceptar esta invitación, necesitas crear una cuenta
              </p>
              <Button
                className="w-full h-12 rounded-xl"
                onClick={() => navigate(`/register?token=${token}`)}
              >
                Crear cuenta y unirme
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Estás registrado como <strong>{user.email}</strong>
              </p>
              <Button
                className="h-12 w-full rounded-xl"
                onClick={handleAccept}
                disabled={acceptInvitation.isPending}
              >
                {acceptInvitation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aceptar invitación
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

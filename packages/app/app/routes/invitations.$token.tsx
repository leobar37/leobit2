import { useParams, useNavigate } from "react-router";
import { Store, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: invitation, isLoading, error } = useValidateInvitation(token || "");
  const acceptInvitation = useAcceptInvitation();

  const handleAccept = async () => {
    if (!token || !user) return;

    try {
      await acceptInvitation.mutateAsync({ token, userId: user.id });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
            <p className="mt-4 text-muted-foreground">Verificando invitación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 p-4">
      <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">¡Te han invitado!</CardTitle>
          <CardDescription>
            Has sido invitado a unirte a un negocio en Avileo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-2xl p-4 text-center">
            <p className="font-semibold text-lg">{invitation.name}</p>
            <p className="text-sm text-muted-foreground">{invitation.email}</p>
            {invitation.salesPoint && (
              <p className="text-sm text-orange-600 mt-2">
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
                onClick={() => navigate(`/register?invitation=${token}`)}
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
                className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600"
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

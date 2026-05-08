import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { AlertCircle, ArrowLeft, CarFront } from "lucide-react";
import { MobileShell } from "~/components/mobile/mobile-shell";
import { MobileSlot } from "~/components/mobile/mobile-slots";
import { MobilePage } from "~/components/mobile/mobile-page";
import {
  EntryForm,
  type EntryFormData,
} from "~/components/cochera/entry-form";
import {
  useCreateCocheraSession,
} from "~/hooks/use-cochera-sessions";
import { useBusinessMode } from "~/hooks/use-business-mode";

export default function CocheraEntradaPage() {
  const navigate = useNavigate();
  const { is } = useBusinessMode();
  const createMutation = useCreateCocheraSession();

  const handleSubmit = useCallback(
    async (data: EntryFormData) => {
      await createMutation.mutateAsync({
        plate: data.plate,
        vehicleType: data.vehicleType,
        notes: data.notes,
      });
      navigate("/cochera");
    },
    [createMutation, navigate]
  );

  if (!is.cochera) {
    return (
      <MobileShell.Root variant="protected">
        <MobileShell.BackButton>
          <Link
            to="/dashboard"
            className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </MobileShell.BackButton>

        <MobileShell.Content>
          <MobilePage.Root maxWidth="md">
            <div className="text-center space-y-4 py-12">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                <CarFront className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Modo no disponible</h2>
                <p className="text-sm text-muted-foreground">
                  El registro de entradas solo está disponible para cocheras.
                </p>
              </div>
            </div>
          </MobilePage.Root>
        </MobileShell.Content>
      </MobileShell.Root>
    );
  }

  return (
    <MobileShell.Root variant="protected">
      <MobileShell.BackButton>
        <Link
          to="/cochera"
          className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </MobileShell.BackButton>

      <MobileSlot name="header:center" priority={10}>
        <div className="flex min-w-0 items-center gap-2 flex-1">
          <CarFront className="h-5 w-5 text-orange-600 shrink-0" />
          <h1 className="font-bold text-lg truncate">Nueva entrada</h1>
        </div>
      </MobileSlot>

      <MobileShell.Content>
        <MobilePage.Root maxWidth="md">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto">
                <CarFront className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Registrar entrada</h2>
                <p className="text-sm text-muted-foreground">
                  Ingresa los datos del vehículo que entra
                </p>
              </div>
            </div>

            <EntryForm
              onSubmit={handleSubmit}
              isSubmitting={createMutation.isPending}
            />

            {createMutation.isError ? (
              <div
                data-testid="cochera-entry-error"
                className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error al registrar</p>
                  <p className="text-sm text-red-700">
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : "No se pudo registrar la entrada. Intenta de nuevo."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </MobilePage.Root>
      </MobileShell.Content>
    </MobileShell.Root>
  );
}

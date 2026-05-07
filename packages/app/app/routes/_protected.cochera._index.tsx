import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { Plus, Search, CarFront, Loader2, AlertCircle } from "lucide-react";
import { MobileShell } from "~/components/mobile/mobile-shell";
import { MobileSlot } from "~/components/mobile/mobile-slots";
import { MobilePage } from "~/components/mobile/mobile-page";
import { VehicleCard } from "~/components/cochera/vehicle-card";
import { useCocheraSessions } from "~/hooks/use-cochera-sessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusinessMode } from "~/hooks/use-business-mode";

export default function CocheraIndexPage() {
  const navigate = useNavigate();
  const { is } = useBusinessMode();
  const [search, setSearch] = useState("");
  const { data: sessions, isLoading, error } = useCocheraSessions(search, {
    enabled: is.cochera,
  });

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value.toUpperCase());
    },
    []
  );

  if (!is.cochera) {
    return (
      <MobileShell.Root variant="protected">
        <MobileShell.Content>
          <MobilePage.Root maxWidth="md">
            <div className="text-center space-y-4 py-12">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                <CarFront className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Modo no disponible</h2>
                <p className="text-sm text-muted-foreground">
                  Esta sección solo está disponible para cocheras.
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
      <MobileSlot name="header:center" priority={10}>
        <div className="flex min-w-0 items-center gap-2 flex-1">
          <CarFront className="h-5 w-5 text-orange-600 shrink-0" />
          <h1 className="font-bold text-lg truncate">Vehículos dentro</h1>
        </div>
      </MobileSlot>

      <MobileSlot name="header:right" priority={10}>
        <Button
          variant="ghost"
          size="icon"
          data-testid="cochera-new-entry-header"
          className="rounded-2xl"
          onClick={() => navigate("/cochera/entrada")}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </MobileSlot>

      <MobileShell.Content>
        <MobilePage.Root maxWidth="md">
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 border border-orange-100">
              <div className="flex items-center gap-2">
                <CarFront className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Vehículos activos
                </span>
              </div>
              <span className="text-lg font-bold text-orange-700">
                {sessions?.length ?? 0}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="cochera-search-input"
                placeholder="Buscar por placa..."
                value={search}
                onChange={handleSearchChange}
                className="h-12 rounded-xl pl-10 text-base"
              />
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : error ? (
              <div className="text-center space-y-3 py-12">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Error al cargar</h2>
                  <p className="text-sm text-muted-foreground">
                    No se pudieron cargar los vehículos. Intenta de nuevo.
                  </p>
                </div>
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <VehicleCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="text-center space-y-3 py-12">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                  <CarFront className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {search ? "Sin resultados" : "Sin vehículos"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {search
                      ? `No se encontró ningún vehículo con placa "${search}"`
                      : "No hay vehículos dentro. Registra una nueva entrada."}
                  </p>
                </div>
                {!search && (
                  <Button
                    asChild
                    className="mt-2 rounded-xl bg-orange-500 hover:bg-orange-600"
                  >
                    <Link to="/cochera/entrada">
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva entrada
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </MobilePage.Root>
      </MobileShell.Content>

      {/* FAB */}
      <MobileShell.FloatingAction>
        <Button
          size="icon"
          data-testid="cochera-new-entry-fab"
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"
          onClick={() => navigate("/cochera/entrada")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </MobileShell.FloatingAction>
    </MobileShell.Root>
  );
}

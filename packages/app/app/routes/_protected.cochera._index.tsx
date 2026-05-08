import { useState, useCallback, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  Plus,
  Search,
  CarFront,
  Loader2,
  AlertCircle,
  X,
  ArrowDownUp,
} from "lucide-react";
import { MobileShell } from "~/components/mobile/mobile-shell";
import { MobileSlot } from "~/components/mobile/mobile-slots";
import { MobilePage } from "~/components/mobile/mobile-page";
import { VehicleCard } from "~/components/cochera/vehicle-card";
import { useCocheraSessions } from "~/hooks/use-cochera-sessions";
import { useCocheraSettings } from "~/hooks/use-cochera-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { cn } from "~/lib/utils";
import type { CocheraSession, CocheraVehicleType } from "@avileo/shared";

type VehicleFilter = "todos" | CocheraVehicleType | "long-stay" | "notes";
type SortMode = "longest" | "recent" | "plate";

const FILTER_OPTIONS: Array<{ id: VehicleFilter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "auto", label: "Autos" },
  { id: "moto", label: "Motos" },
  { id: "camioneta", label: "Camionetas" },
  { id: "long-stay", label: "Más de 1h" },
  { id: "notes", label: "Con notas" },
];

const SORT_OPTIONS: Array<{ id: SortMode; label: string }> = [
  { id: "longest", label: "Mayor tiempo" },
  { id: "recent", label: "Recientes" },
  { id: "plate", label: "Placa A-Z" },
];

function getElapsedMinutes(session: CocheraSession, now: Date): number {
  const entry = new Date(session.entryAt);
  return Math.max(0, Math.floor((now.getTime() - entry.getTime()) / 1000 / 60));
}

function getEstimatedAmount(
  session: CocheraSession,
  now: Date,
  settings?: { graceMinutes: number; hourlyRate: string } | null
): number | null {
  if (!settings) return null;

  const rate = Number(settings.hourlyRate) || 0;
  if (rate <= 0) return null;

  const billableMinutes = Math.max(
    0,
    getElapsedMinutes(session, now) - (settings.graceMinutes ?? 0)
  );
  return Math.ceil(billableMinutes / 60) * rate;
}

export default function CocheraIndexPage() {
  const navigate = useNavigate();
  const { is } = useBusinessMode();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<VehicleFilter>("todos");
  const [sortMode, setSortMode] = useState<SortMode>("longest");
  const [now, setNow] = useState(() => new Date());
  const { data: sessions, isLoading, error } = useCocheraSessions(undefined, {
    enabled: is.cochera,
    refetchInterval: search ? false : 30000,
  });
  const { data: settings } = useCocheraSettings({ enabled: is.cochera });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value.toUpperCase());
    },
    []
  );

  const totalCount = sessions?.length ?? 0;
  const filteredSessions = useMemo(() => {
    const normalizedSearch = search.trim().toUpperCase();

    return [...(sessions ?? [])]
      .filter((session) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          session.plate.toUpperCase().includes(normalizedSearch);

        if (!matchesSearch) return false;
        if (filter === "todos") return true;
        if (filter === "long-stay") return getElapsedMinutes(session, now) >= 60;
        if (filter === "notes") return Boolean(session.notes?.trim());
        return session.vehicleType === filter;
      })
      .sort((a, b) => {
        if (sortMode === "plate") {
          return a.plate.localeCompare(b.plate, "es-PE");
        }

        if (sortMode === "recent") {
          return (
            new Date(b.entryAt).getTime() - new Date(a.entryAt).getTime()
          );
        }

        return getElapsedMinutes(b, now) - getElapsedMinutes(a, now);
      });
  }, [sessions, search, filter, sortMode, now]);

  const hasActiveFilters = search.trim().length > 0 || filter !== "todos";
  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.id === sortMode)?.label ??
    "Mayor tiempo";

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
          <div className="space-y-4 pb-3">
            <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 dark:border-orange-500/20 dark:bg-orange-500/10">
              <div className="flex items-center gap-2">
                <CarFront className="h-5 w-5 text-orange-600" />
                <div>
                  <span className="block text-sm font-medium text-orange-800 dark:text-orange-200">
                    Vehículos dentro
                  </span>
                  {hasActiveFilters ? (
                    <span className="text-xs text-orange-700/80 dark:text-orange-200/80">
                      {filteredSessions.length} resultados
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="text-lg font-bold text-orange-700 dark:text-orange-200">
                {totalCount}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="cochera-search-input"
                placeholder="Buscar por placa..."
                value={search}
                onChange={handleSearchChange}
                className="h-12 rounded-xl pl-10 pr-10 text-base"
              />
              {search ? (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`cochera-filter-${option.id}`}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                    filter === option.id
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-border bg-card text-muted-foreground hover:border-orange-300 hover:text-foreground"
                  )}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ArrowDownUp className="h-3.5 w-3.5" />
                Orden
              </span>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`cochera-sort-${option.id}`}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    sortMode === option.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={sortMode === option.id}
                  onClick={() => setSortMode(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

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
            ) : filteredSessions.length > 0 ? (
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <VehicleCard
                    key={session.id}
                    session={session}
                    now={now}
                    estimatedAmount={getEstimatedAmount(session, now, settings)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center space-y-3 py-12">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                  <CarFront className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {hasActiveFilters ? "Sin resultados" : "Sin vehículos"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? `No hay vehículos para los filtros actuales. Orden: ${activeSortLabel}.`
                      : "No hay vehículos dentro. Registra una nueva entrada."}
                  </p>
                </div>
                {!hasActiveFilters && (
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
    </MobileShell.Root>
  );
}

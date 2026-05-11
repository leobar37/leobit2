import { useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, MapPinned, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useCreateWaterRoute, useWaterRoutes, type WaterRoute } from "~/hooks/use-water-routes";
import { cn } from "~/lib/utils";

interface WaterRouteSelectorProps {
  value: string | null;
  onChange: (route: WaterRoute | null) => void;
  label?: string;
  helperText?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function WaterRouteSelector({
  value,
  onChange,
  label = "Ruta",
  helperText,
  placeholder = "Seleccionar ruta",
  allowEmpty = true,
  required = false,
  disabled = false,
}: WaterRouteSelectorProps) {
  const { data: routes = [], isLoading } = useWaterRoutes();
  const createRoute = useCreateWaterRoute();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newRouteName, setNewRouteName] = useState("");

  const selectedRoute = routes.find((route) => route.id === value) ?? null;
  const filteredRoutes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return routes;
    return routes.filter((route) =>
      [route.name, route.zone, route.description]
        .filter(Boolean)
        .some((item) => item!.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, routes]);

  const handleSelect = (route: WaterRoute | null) => {
    onChange(route);
    setIsOpen(false);
    setQuery("");
  };

  const handleCreateRoute = async () => {
    if (!newRouteName.trim()) return;
    const route = await createRoute.mutateAsync({ name: newRouteName.trim() });
    onChange(route);
    setNewRouteName("");
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-muted-foreground">
          {label}
          {required ? " *" : ""}
        </label>
        {helperText && (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        )}
      </div>

      <button
        data-testid="water-route-selector"
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/55 px-3 py-2 text-left transition-colors dark:border-white/[0.08] dark:bg-white/[0.03]",
          !disabled && "hover:bg-accent/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300">
            <MapPinned className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className={cn("block truncate text-sm", selectedRoute ? "font-medium text-foreground" : "text-muted-foreground")}>
              {selectedRoute?.name ?? placeholder}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {selectedRoute?.zone || selectedRoute?.description || "Ruta formal para agrupar clientes de agua"}
            </span>
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <AppDrawer open={isOpen} onOpenChange={setIsOpen} size="large">
        <AppDrawer.Header
          title="Seleccionar ruta"
          icon={<MapPinned className="h-5 w-5" />}
          onClose={() => setIsOpen(false)}
        />

        <AppDrawer.Body className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar ruta..."
              className="shell-search-field pl-9"
            />
          </div>

          <div className="space-y-2">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                  !value
                    ? "border-sky-400/70 bg-sky-500/10"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Sin ruta asignada</span>
                  <span className="block text-xs text-muted-foreground">
                    Úsalo cuando el cliente todavía no pertenece a una ruta.
                  </span>
                </span>
                {!value && <Check className="h-4 w-4 text-sky-600 dark:text-sky-300" />}
              </button>
            )}

            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Cargando rutas...
              </p>
            ) : filteredRoutes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No se encontraron rutas.
              </p>
            ) : (
              filteredRoutes.map((route) => {
                const isSelected = route.id === value;
                return (
                  <button
                    data-testid="water-route-selector-option"
                    key={route.id}
                    type="button"
                    onClick={() => handleSelect(route)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                      isSelected
                        ? "border-sky-400/70 bg-sky-500/10"
                        : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300">
                        <MapPinned className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{route.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {route.zone || route.description || "Ruta de agua"}
                        </span>
                      </span>
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-border/70 pt-4 dark:border-white/[0.08]">
            <div className="flex gap-2">
              <Input
                value={newRouteName}
                onChange={(event) => setNewRouteName(event.target.value)}
                placeholder="Nueva ruta..."
                className="shell-field h-10 min-w-0 flex-1 rounded-lg px-3 text-sm"
              />
              <Button
                data-testid="water-route-selector-create"
                type="button"
                variant="outline"
                onClick={handleCreateRoute}
                disabled={!newRouteName.trim() || createRoute.isPending}
                className="h-10 rounded-lg px-3"
              >
                {createRoute.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Crear
              </Button>
            </div>
          </div>
        </AppDrawer.Body>
      </AppDrawer>
    </div>
  );
}

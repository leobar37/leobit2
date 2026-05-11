import { useState } from "react";
import { Check, Loader2, MapPinned, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormPage } from "~/components/layout/form-page";
import { useBusiness } from "@/hooks/use-business";
import { useToastError } from "~/hooks/use-toast-error";
import { useCreateWaterRoute, useUpdateWaterRoute, useWaterRoutes, type WaterRoute } from "~/hooks/use-water-routes";

export default function WaterRoutesConfigPage() {
  const { data: business } = useBusiness();
  const { data: routes = [], isLoading } = useWaterRoutes();
  const createRoute = useCreateWaterRoute();
  const updateRoute = useUpdateWaterRoute();
  const { showSuccess, showError } = useToastError();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Record<string, Pick<WaterRoute, "name" | "zone" | "description">>>({});

  if (business && business.role !== "ADMIN_NEGOCIO") {
    return (
      <FormPage title="Rutas de Agua" backHref="/config" icon={MapPinned}>
        <div className="border-l-2 border-amber-500 py-2 pl-3 text-sm text-muted-foreground">
          La gestión de rutas está disponible para el dueño o administrador del negocio.
        </div>
      </FormPage>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createRoute.mutateAsync({ name: newName.trim() });
      setNewName("");
      showSuccess("Ruta creada", {
        description: "La ruta de agua ya está disponible para clientes y entregas.",
      });
    } catch (error) {
      showError("No se pudo crear la ruta", error);
    }
  };

  const getDraft = (route: WaterRoute) =>
    editing[route.id] ?? {
      name: route.name,
      zone: route.zone ?? "",
      description: route.description ?? "",
    };

  const updateDraft = (route: WaterRoute, field: "name" | "zone" | "description", value: string) => {
    setEditing((current) => ({
      ...current,
      [route.id]: {
        ...getDraft(route),
        [field]: value,
      },
    }));
  };

  const handleSave = async (route: WaterRoute) => {
    const draft = getDraft(route);
    if (!draft.name.trim()) return;
    try {
      await updateRoute.mutateAsync({
        id: route.id,
        name: draft.name.trim(),
        zone: draft.zone?.trim() || null,
        description: draft.description?.trim() || null,
      });
      setEditing((current) => {
        const next = { ...current };
        delete next[route.id];
        return next;
      });
      showSuccess("Ruta actualizada");
    } catch (error) {
      showError("No se pudo actualizar la ruta", error);
    }
  };

  const handleToggleActive = async (route: WaterRoute, isActive: boolean) => {
    try {
      await updateRoute.mutateAsync({
        id: route.id,
        isActive,
      });
    } catch (error) {
      showError("No se pudo cambiar el estado de la ruta", error);
    }
  };

  return (
    <FormPage title="Rutas de Agua" backHref="/config" icon={MapPinned}>
      <div className="space-y-5">
        <section className="space-y-3 border-b border-border/60 pb-5 dark:border-white/[0.07]">
          <div>
            <h2 className="text-base font-semibold">Nueva ruta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea rutas formales para agrupar clientes y preparar entregas del día.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Ej. Ruta Norte"
              className="shell-field h-11 min-w-0 flex-1 rounded-lg px-3 text-sm"
            />
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || createRoute.isPending}
              className="h-11 rounded-lg px-3"
            >
              {createRoute.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Crear
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Rutas configuradas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estas rutas aparecen en clientes y en la creación de rutas diarias.
            </p>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Cargando rutas...
            </div>
          ) : routes.length === 0 ? (
            <div className="border-l-2 border-sky-500/70 py-2 pl-3 text-sm text-muted-foreground">
              Todavía no hay rutas de agua. Crea la primera para organizar tus clientes.
            </div>
          ) : (
            <div className="space-y-4">
              {routes.map((route) => {
                const draft = getDraft(route);
                const hasChanges =
                  draft.name !== route.name ||
                  draft.zone !== (route.zone ?? "") ||
                  draft.description !== (route.description ?? "");

                return (
                  <article
                    key={route.id}
                    className="space-y-3 border-b border-border/60 pb-4 last:border-b-0 dark:border-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{route.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {route.zone || route.description || "Sin zona o detalle adicional"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {route.isActive ? "Activa" : "Inactiva"}
                        </span>
                        <Switch
                          checked={Boolean(route.isActive)}
                          onCheckedChange={(checked) => handleToggleActive(route, checked)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <Input
                        value={draft.name}
                        onChange={(event) => updateDraft(route, "name", event.target.value)}
                        placeholder="Nombre de ruta"
                        className="shell-field h-10 rounded-lg px-3 text-sm"
                      />
                      <Input
                        value={draft.zone ?? ""}
                        onChange={(event) => updateDraft(route, "zone", event.target.value)}
                        placeholder="Zona o sector"
                        className="shell-field h-10 rounded-lg px-3 text-sm"
                      />
                      <Input
                        value={draft.description ?? ""}
                        onChange={(event) => updateDraft(route, "description", event.target.value)}
                        placeholder="Descripción opcional"
                        className="shell-field h-10 rounded-lg px-3 text-sm"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSave(route)}
                      disabled={!hasChanges || !draft.name.trim() || updateRoute.isPending}
                      className="h-10 w-full rounded-lg"
                    >
                      {updateRoute.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : hasChanges ? (
                        <Save className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Guardar cambios
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </FormPage>
  );
}

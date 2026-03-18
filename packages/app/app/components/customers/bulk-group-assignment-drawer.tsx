import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Users, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createModal } from "~/lib/modal/create-modal";
import { cn } from "~/lib/utils";
import { useSync } from "~/components/sync/sync-status";
import {
  useCustomerGroups,
  useCreateCustomerGroup,
  useAddMembersToGroup,
} from "~/hooks/use-grupos";

interface BulkGroupAssignmentData {
  customerIds: string[];
  onAssigned?: () => void;
}

function BulkGroupAssignmentDrawerContent({
  close,
  customerIds,
  onAssigned,
}: BulkGroupAssignmentData & { close: () => void }) {
  const { isOnline } = useSync();
  const { data: groups = [], isLoading } = useCustomerGroups();
  const createGroup = useCreateCustomerGroup();
  const addMembers = useAddMembersToGroup();
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isCreateExpanded, setIsCreateExpanded] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const selectedCount = selectedGroupIds.size;
  const canSubmit = selectedCount > 0 && !createGroup.isPending && !addMembers.isPending && isOnline;
  const canCreateGroup = newGroupName.trim().length > 0 && !createGroup.isPending && isOnline;

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [groups]
  );

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name || !isOnline) return;

    try {
      const createdGroup = await createGroup.mutateAsync({ name });
      setSelectedGroupIds((prev) => new Set(prev).add(createdGroup.id));
      setNewGroupName("");
      setIsCreateExpanded(false);
      toast.success("Grupo creado y seleccionado");
    } catch (error) {
      // Error toast is handled by the mutation hook
    }
  };

  const handleAssign = async () => {
    const groupIds = Array.from(selectedGroupIds);

    if (groupIds.length === 0 || !isOnline) return;

    try {
      await Promise.all(
        groupIds.map((groupId) =>
          addMembers.mutateAsync({
            customerIds,
            groupId,
          })
        )
      );

      toast.success(
        customerIds.length === 1
          ? "Cliente agregado a los grupos seleccionados"
          : "Clientes agregados a los grupos seleccionados"
      );

      onAssigned?.();
      setSelectedGroupIds(new Set());
      setNewGroupName("");
      setIsCreateExpanded(false);
      close();
    } catch (error) {
      // Error toast is handled by the mutation hook
    }
  };

  const handleClose = () => {
    setSelectedGroupIds(new Set());
    setNewGroupName("");
    setIsCreateExpanded(false);
    close();
  };

  return (
    <>
      <DrawerHeader className="px-4 pb-3 pt-2">
        <DrawerTitle>Asignar grupos ({customerIds.length} clientes)</DrawerTitle>
        <DrawerDescription>
          Selecciona uno o varios grupos para afiliar a los clientes elegidos.
        </DrawerDescription>
      </DrawerHeader>

      {!isOnline && (
        <div className="px-4">
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Conéctate a internet para gestionar grupos
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Cargando grupos...
              </p>
            ) : sortedGroups.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-muted-foreground">
                Aún no hay grupos. Crea el primero para empezar.
              </p>
            ) : (
              sortedGroups.map((group) => {
                const isSelected = selectedGroupIds.has(group.id);

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleGroupSelection(group.id)}
                    disabled={!isOnline}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                      isSelected
                        ? "border-orange-300 bg-orange-50"
                        : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/40",
                      !isOnline && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                        isSelected
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-stone-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{group.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.memberCount ?? 0} clientes
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => setIsCreateExpanded((prev) => !prev)}
              disabled={!isOnline}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left",
                !isOnline && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="flex items-center gap-2 font-medium text-orange-700">
                <Plus className="h-4 w-4" />
                Crear nuevo grupo
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isCreateExpanded && "rotate-180"
                )}
              />
            </button>

            {isCreateExpanded && (
              <div className="space-y-3 border-t border-stone-100 px-4 py-4">
                <Input
                  placeholder="Nombre del grupo"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateGroup();
                    }
                  }}
                  disabled={!isOnline}
                />
                <Button
                  type="button"
                  onClick={() => void handleCreateGroup()}
                  disabled={!canCreateGroup}
                  className="h-11 w-full rounded-xl bg-orange-500 hover:bg-orange-600"
                >
                  {createGroup.isPending ? "Creando..." : "Crear y seleccionar"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <DrawerFooter className="mt-auto flex-row gap-3 px-4 pb-6 pt-2 sm:flex-row sm:space-x-0">
        <Button variant="outline" onClick={handleClose} className="h-12 flex-1 rounded-xl">
          Cancelar
        </Button>
        <Button
          onClick={() => void handleAssign()}
          disabled={!canSubmit}
          className="h-12 flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
        >
          {addMembers.isPending
            ? "Guardando..."
            : `Agregar a ${selectedCount} grupo${selectedCount === 1 ? "" : "s"}`}
        </Button>
      </DrawerFooter>
    </>
  );
}

export const [BulkGroupAssignmentDrawer, useBulkGroupAssignmentDrawer] = createModal(
  BulkGroupAssignmentDrawerContent,
  { type: "drawer" }
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Loader2 } from "lucide-react";
import { createModal } from "~/lib/modal/create-modal";
import { useOnline } from "~/hooks/use-online";

interface GroupFormData {
  mode: "create" | "edit";
  groupName: string;
  onGroupNameChange: (name: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function GroupFormDrawerContent({
  close,
  mode,
  groupName,
  onGroupNameChange,
  onSubmit,
  isSubmitting,
}: GroupFormData & { close: () => void }) {
  const { isOnline } = useOnline();

  return (
    <>
      <DrawerHeader className="px-4 pb-3 pt-2">
        <DrawerTitle>
          {mode === "create" ? "Nuevo Grupo de Clientes" : "Editar Grupo"}
        </DrawerTitle>
        <DrawerDescription>
          Crea un grupo para organizar tus clientes
        </DrawerDescription>
      </DrawerHeader>

      <div className="px-4 py-4">
        <Input
          placeholder="Nombre del grupo"
          value={groupName}
          onChange={(e) => onGroupNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && isOnline && onSubmit()}
          autoFocus
          disabled={!isOnline}
        />
      </div>

      <DrawerFooter className="mt-auto flex-row gap-3 px-4 pb-6 pt-2 sm:flex-row sm:space-x-0">
        <Button
          variant="outline"
          onClick={close}
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!groupName.trim() || isSubmitting || !isOnline}
          className="h-12 flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Crear grupo" : "Guardar cambios"}
        </Button>
      </DrawerFooter>
    </>
  );
}

export const [GroupFormDrawer, useGroupFormDrawer] = createModal<GroupFormData>(
  GroupFormDrawerContent,
  { type: "drawer" }
);
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface GroupFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  groupName: string;
  onGroupNameChange: (name: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function GroupFormDialog({
  isOpen,
  onOpenChange,
  mode,
  groupName,
  onGroupNameChange,
  isSubmitting,
  onSubmit,
}: GroupFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nuevo Grupo de Clientes" : "Editar Grupo"}
          </DialogTitle>
          <DialogDescription>
            Crea un grupo para organizar tus clientes
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Nombre del grupo"
            value={groupName}
            onChange={(e) => onGroupNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!groupName.trim() || isSubmitting}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Crear grupo" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

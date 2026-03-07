/**
 * Bulk Tag Assignment Drawer
 * Drawer for assigning tags to multiple customers at once
 */
import { useState } from "react";
import { toast } from "sonner";
import { Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDrawer } from "~/components/ui/app-drawer";
import { TagSelect } from "~/components/tags";
import { useBulkAssignTags } from "~/hooks/use-bulk-assign-tags";

interface BulkTagAssignmentDrawerProps {
  customerIds: string[];
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkTagAssignmentDrawer({
  customerIds,
  open,
  onClose,
  onSuccess,
}: BulkTagAssignmentDrawerProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const assignMutation = useBulkAssignTags();

  const handleSave = async () => {
    try {
      await assignMutation.mutateAsync({
        customerIds,
        tagIds: selectedTagIds,
      });
      toast.success(`Etiquetas asignadas a ${customerIds.length} cliente(s)`);
      setSelectedTagIds([]);
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error("Error al asignar etiquetas");
    }
  };

  const handleClose = () => {
    setSelectedTagIds([]);
    onClose();
  };

  return (
    <AppDrawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <AppDrawer.Header
        title={`Asignar Etiquetas (${customerIds.length} clientes)`}
        icon={<Tag className="h-5 w-5" />}
        onClose={handleClose}
      />

      <AppDrawer.Body>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecciona las etiquetas que deseas asignar a los clientes seleccionados.
            Las etiquetas seleccionadas reemplazarán las actuales de cada cliente.
          </p>

          <TagSelect
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        </div>
      </AppDrawer.Body>

      <AppDrawer.Footer>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={assignMutation.isPending}
            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            {assignMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </AppDrawer.Footer>
    </AppDrawer>
  );
}

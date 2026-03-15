/**
 * Bulk Customer Tags Modal
 * Modal for assigning tags to multiple customers using createModal pattern
 */
import { useState } from "react";
import { toast } from "sonner";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createModal } from "~/lib/modal/create-modal";
import { TagSelect } from "~/components/tags";
import { useBulkAssignTags } from "~/hooks/use-bulk-assign-tags";

interface BulkCustomerTagsData {
  customerIds: string[];
}

function BulkCustomerTagsModalContent({
  close,
  customerIds,
}: BulkCustomerTagsData & { close: () => void }) {
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
      close();
    } catch (error) {
      toast.error("Error al asignar etiquetas");
    }
  };

  const handleClose = () => {
    setSelectedTagIds([]);
    close();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Asignar Etiquetas ({customerIds.length} clientes)</DialogTitle>
        <DialogDescription>
          Selecciona las etiquetas que deseas asignar a los clientes seleccionados.
          Las etiquetas seleccionadas reemplazarán las actuales de cada cliente.
        </DialogDescription>
      </DialogHeader>

      <div className="py-6">
        <TagSelect
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
        />
      </div>

      <DialogFooter className="flex flex-row gap-3 mt-6">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={assignMutation.isPending}
          className="flex-1"
        >
          {assignMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </>
  );
}

export const [BulkCustomerTagsModal, useBulkCustomerTagsModal] = createModal<
  BulkCustomerTagsData
>(BulkCustomerTagsModalContent, { type: "dialog" });

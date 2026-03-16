/**
 * Bulk Customer Tags Modal
 * Modal for assigning tags to multiple customers using createModal pattern
 */
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
      <DrawerHeader className="px-4 pb-3 pt-2">
        <DrawerTitle>Asignar Etiquetas ({customerIds.length} clientes)</DrawerTitle>
        <DrawerDescription>
          Selecciona las etiquetas que deseas asignar a los clientes seleccionados.
          Las etiquetas seleccionadas reemplazarán las actuales de cada cliente.
        </DrawerDescription>
      </DrawerHeader>

      <div className="px-4 py-4">
        <div className="space-y-4">
          <TagSelect
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
          <Button asChild variant="ghost" className="h-11 w-full justify-center rounded-xl text-orange-600 hover:bg-orange-50 hover:text-orange-700">
            <Link to="/config/tags" onClick={handleClose}>
              <Plus className="h-4 w-4" />
              Crear etiquetas
            </Link>
          </Button>
        </div>
      </div>

      <DrawerFooter className="mt-auto flex-row gap-3 px-4 pb-6 pt-2 sm:flex-row sm:space-x-0">
        <Button variant="outline" onClick={handleClose} className="h-12 flex-1 rounded-xl">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={assignMutation.isPending}
          className="h-12 flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
        >
          {assignMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </DrawerFooter>
    </>
  );
}

export const [BulkCustomerTagsModal, useBulkCustomerTagsModal] = createModal<
  BulkCustomerTagsData
>(BulkCustomerTagsModalContent, { type: "drawer" });

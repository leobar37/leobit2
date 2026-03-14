/**
 * Customer Tags Modal
 * Modal for assigning tags to a customer using createModal pattern
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import {
  useCustomerTags,
  useAssignCustomerTags,
} from "~/hooks/use-customer-tags";

interface CustomerTagsData {
  customerId: string;
}

function CustomerTagsModalContent({
  close,
  customerId,
}: CustomerTagsData & { close: () => void }) {
  const { data: customerTags, isLoading } = useCustomerTags(customerId);
  const assignMutation = useAssignCustomerTags();

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (customerTags) {
      setSelectedTagIds(customerTags.map((ct) => ct.tagId));
    }
  }, [customerTags]);

  const handleSave = async () => {
    try {
      await assignMutation.mutateAsync({ customerId, tagIds: selectedTagIds });
      toast.success("Etiquetas actualizadas");
      close();
    } catch (error) {
      toast.error("Error al actualizar etiquetas");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Asignar Etiquetas</DialogTitle>
        <DialogDescription>
          Selecciona las etiquetas para este cliente
        </DialogDescription>
      </DialogHeader>

      <div className="py-6">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">
            Cargando etiquetas...
          </p>
        ) : (
          <TagSelect
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        )}
      </div>

      <DialogFooter className="flex flex-row gap-3 mt-6">
        <Button variant="outline" onClick={close} className="flex-1">
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

export const [CustomerTagsModal, useCustomerTagsModal] = createModal<
  CustomerTagsData
>(CustomerTagsModalContent, { type: "dialog" });

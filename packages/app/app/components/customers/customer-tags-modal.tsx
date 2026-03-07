/**
 * Customer Tags Modal
 * Modal for assigning tags to a customer
 */
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagSelect } from "~/components/tags";
import {
  useCustomerTags,
  useAssignCustomerTags,
} from "~/hooks/use-customer-tags";

interface CustomerTagsModalProps {
  customerId: string;
  open: boolean;
  onClose: () => void;
}

export function CustomerTagsModal({
  customerId,
  open,
  onClose,
}: CustomerTagsModalProps) {
  const { data: customerTags, isLoading } = useCustomerTags(customerId);
  const assignMutation = useAssignCustomerTags();

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Initialize selected tags when modal opens
  useEffect(() => {
    if (open && customerTags) {
      setSelectedTagIds(customerTags.map((ct) => ct.tagId));
    }
  }, [open, customerTags]);

  const handleSave = async () => {
    try {
      await assignMutation.mutateAsync({ customerId, tagIds: selectedTagIds });
      toast.success("Etiquetas actualizadas");
      onClose();
    } catch (error) {
      toast.error("Error al actualizar etiquetas");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Etiquetas</DialogTitle>
          <DialogDescription>
            Selecciona las etiquetas para este cliente
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">
              Cargando etiquetas...
            </p>
          ) : (
            <TagSelect
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

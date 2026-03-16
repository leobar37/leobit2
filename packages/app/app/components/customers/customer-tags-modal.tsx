/**
 * Customer Tags Modal
 * Modal for assigning tags to a customer using createModal pattern
 */
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
      <DrawerHeader className="px-4 pb-3 pt-2">
        <DrawerTitle>Asignar Etiquetas</DrawerTitle>
        <DrawerDescription>
          Selecciona las etiquetas para este cliente
        </DrawerDescription>
      </DrawerHeader>

      <div className="px-4 py-4">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">
            Cargando etiquetas...
          </p>
        ) : (
          <div className="space-y-4">
            <TagSelect
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
            />
            <Button asChild variant="ghost" className="h-11 w-full justify-center rounded-xl text-orange-600 hover:bg-orange-50 hover:text-orange-700">
              <Link to="/config/tags" onClick={close}>
                <Plus className="h-4 w-4" />
                Crear etiquetas
              </Link>
            </Button>
          </div>
        )}
      </div>

      <DrawerFooter className="mt-auto flex-row gap-3 px-4 pb-6 pt-2 sm:flex-row sm:space-x-0">
        <Button variant="outline" onClick={close} className="h-12 flex-1 rounded-xl">
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

export const [CustomerTagsModal, useCustomerTagsModal] = createModal<
  CustomerTagsData
>(CustomerTagsModalContent, { type: "drawer" });

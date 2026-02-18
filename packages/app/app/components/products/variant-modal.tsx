import { createModal } from "~/lib/modal/create-modal";
import { ModalHeader, ModalBody, ModalFooter } from "~/lib/modal/components";
import { VariantForm, type VariantFormData } from "./variant-form";
import { Button } from "@/components/ui/button";

interface VariantModalData {
  variant?: {
    id: string;
    name: string;
    sku: string | null;
    unitQuantity: string;
    price: string;
    isActive: boolean;
  };
  onSubmit: (data: VariantFormData) => Promise<void>;
  isLoading: boolean;
  isEditing: boolean;
}

function VariantModalContent({
  close,
  variant,
  onSubmit,
  isLoading,
  isEditing,
}: VariantModalData & { close: () => void }) {
  return (
    <>
      <ModalHeader>
        <h2 className="text-lg font-semibold">
          {isEditing ? "Editar Variante" : "Nueva Variante"}
        </h2>
      </ModalHeader>

      <ModalBody>
        <VariantForm
          variant={variant}
          onSubmit={async (data) => {
            await onSubmit(data);
            close();
          }}
          onCancel={close}
          isLoading={isLoading}
        />
      </ModalBody>
    </>
  );
}

export const [VariantModal, useVariantModal] = createModal<
  VariantModalData
>(VariantModalContent, { type: "responsive" });
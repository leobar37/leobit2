import { createModal } from "~/lib/modal/create-modal";
import { ModalBody } from "~/lib/modal/components";
import { VariantForm, type VariantFormData } from "./variant-form";

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
}: VariantModalData & { close: () => void }) {
  return (
    <>
      <ModalBody className="px-4 py-4">
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

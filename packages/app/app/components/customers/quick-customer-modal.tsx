import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { createModal } from "~/lib/modal/create-modal";
import { useCreateCustomer } from "~/hooks/use-customers";
import { FormInput } from "~/components/forms/form-input";
import type { Customer } from "~/hooks/use-customers";

const quickCustomerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z
    .string()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      return /^9\d{8}$/.test(val);
    }, "Debe ser un celular válido (9 dígitos comenzando con 9)"),
});

export type QuickCustomerFormData = z.infer<typeof quickCustomerSchema>;

// Data interface for the modal (without close - injected by createModal)
interface QuickCustomerModalData {
  onSuccess?: (customer: Customer) => void;
  initialName?: string;
}

// Full props including close (injected by createModal)
interface QuickCustomerModalContentProps extends QuickCustomerModalData {
  close: () => void;
}

function QuickCustomerModalContent({
  close,
  onSuccess,
  initialName = "",
}: QuickCustomerModalContentProps) {
  const form = useForm<QuickCustomerFormData>({
    resolver: zodResolver(quickCustomerSchema),
    mode: "onChange",
    defaultValues: {
      name: initialName,
      phone: null,
    },
  });

  const createCustomer = useCreateCustomer();

  const onSubmit = form.handleSubmit(async (formData) => {
    try {
      const input = {
        name: formData.name,
        phone: formData.phone ?? undefined,
      };
      const customer = await createCustomer.mutateAsync(input);
      toast.success("Cliente creado", {
        description: `${customer.name} ha sido agregado`,
      });
      onSuccess?.(customer);
      close();
    } catch (error) {
      console.error("[QuickCustomerModal] Error creating customer:", error);
      const message =
        error instanceof Error ? error.message : "Error al crear cliente";
      toast.error(message);
    }
  });

  return (
    <>
      <DrawerHeader className="px-4 pb-3 pt-2">
        <DrawerTitle>Crear nuevo cliente</DrawerTitle>
        <DrawerDescription>
          Agrega un cliente rápidamente. Puedes completar más datos después.
        </DrawerDescription>
      </DrawerHeader>

      <FormProvider {...form}>
        <form onSubmit={onSubmit} className="px-4 py-4 space-y-4">
          <FormInput
            name="name"
            label="Nombre *"
            placeholder="Nombre completo"
            required
          />

          <FormInput
            name="phone"
            label="Teléfono (opcional)"
            placeholder="987654321"
          />
        </form>
      </FormProvider>

      <DrawerFooter className="mt-auto flex-row gap-3 px-4 pb-6 pt-2 sm:flex-row sm:space-x-0">
        <Button
          type="button"
          variant="outline"
          onClick={close}
          className="h-12 flex-1 rounded-xl"
          disabled={createCustomer.isPending}
        >
          Cancelar
        </Button>
        <Button
          onClick={onSubmit}
          className="h-12 flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
          disabled={createCustomer.isPending || !form.formState.isValid}
        >
          {createCustomer.isPending ? "Creando..." : "Crear Cliente"}
        </Button>
      </DrawerFooter>
    </>
  );
}

export const [QuickCustomerModal, useQuickCustomerModal] = createModal<QuickCustomerModalData>(
  QuickCustomerModalContent,
  {
    type: "drawer",
  }
);

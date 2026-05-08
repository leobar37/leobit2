import { useNavigate } from "react-router";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateCustomer } from "~/hooks/use-customers";
import { FormPage } from "~/components/layout/form-page";
import {
  CustomerFormContent,
  customerSchema,
  type CustomerFormData,
} from "~/components/customers/customer-form-content";
import { useBusinessMode } from "~/hooks/use-business-mode";

export default function NewCustomerPage() {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer();
  const { mode } = useBusinessMode();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      dni: null,
      phone: null,
      address: null,
      notes: null,
      waterProfile: {
        deliveryFrequency: "weekly",
        deliveryDays: [],
        defaultContainerQuantity: 1,
        containersAtCustomer: 0,
        depositAmount: 0,
        depositStatus: "none",
        depositExceptionReason: null,
        waterRouteId: null,
        preferredRoute: null,
        deliveryInstructions: null,
      },
    },
  });

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      // Transform null values to undefined for the new API
      const input = {
        name: data.name,
        dni: data.dni ?? undefined,
        phone: data.phone ?? undefined,
        address: data.address ?? undefined,
        notes: data.notes ?? undefined,
        ...(mode === "agua" && data.waterProfile
          ? {
                waterProfile: {
                  ...data.waterProfile,
                defaultContainerQuantity: Number(data.waterProfile.defaultContainerQuantity ?? 1),
                containersAtCustomer: 0,
                depositAmount: "0",
                depositStatus: "none",
                depositExceptionReason: null,
                waterRouteId: data.waterProfile.waterRouteId || null,
                preferredRoute: data.waterProfile.preferredRoute || null,
                deliveryInstructions: data.waterProfile.deliveryInstructions || null,
              },
            }
          : {}),
      };
      await createCustomer.mutateAsync(input);
      navigate("/clientes");
    } catch (error) {
      console.error("Error al crear cliente", error);
    }
  };

  const { isValid } = form.formState;

  return (
    <FormPage
      title="Nuevo Cliente"
      backHref="/clientes"
      icon={User}
      toolbar={
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          disabled={createCustomer.isPending || !isValid}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {createCustomer.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Guardar Cliente
            </>
          )}
        </Button>
      }
    >
      <FormProvider {...form}>
        <CustomerFormContent />
      </FormProvider>
    </FormPage>
  );
}

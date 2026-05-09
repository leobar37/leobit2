import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useParams, useNavigate } from "react-router";
import { User, Loader2 } from "lucide-react";
import { useCustomer, useUpdateCustomer } from "~/hooks/use-customers";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormPage } from "~/components/layout/form-page";
import { MobilePage } from "~/components/mobile/mobile-page";
import {
  CustomerFormContent,
  customerSchema,
  type CustomerFormData,
} from "~/components/customers/customer-form-content";
import { useBusinessMode } from "~/hooks/use-business-mode";

export default function EditCustomerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id!);
  const updateCustomer = useUpdateCustomer();
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
        waterRouteId: null,
        preferredRoute: null,
        deliveryInstructions: null,
      },
    },
    values: customer
      ? {
          name: customer.name,
          dni: customer.dni || null,
          phone: customer.phone || null,
          address: customer.address || null,
          notes: customer.notes || null,
          waterProfile: {
            deliveryFrequency: customer.waterProfile?.deliveryFrequency ?? "weekly",
            deliveryDays: customer.waterProfile?.deliveryDays ?? [],
            defaultContainerQuantity: customer.waterProfile?.defaultContainerQuantity ?? 1,
            waterRouteId: customer.waterProfile?.waterRouteId ?? null,
            preferredRoute: customer.waterProfile?.preferredRoute ?? null,
            deliveryInstructions: customer.waterProfile?.deliveryInstructions ?? null,
          },
        }
      : undefined,
  });

  const onSubmit = async (data: CustomerFormData) => {
    if (!id) return;

    try {
      await updateCustomer.mutateAsync({
        id,
        input: {
          name: data.name,
          dni: data.dni || undefined,
          phone: data.phone || undefined,
          address: data.address || undefined,
          notes: data.notes || undefined,
          ...(mode === "agua" && data.waterProfile
            ? {
                waterProfile: {
                  deliveryFrequency: data.waterProfile.deliveryFrequency || "weekly",
                  deliveryDays: data.waterProfile.deliveryDays ?? [],
                  defaultContainerQuantity: Number(data.waterProfile.defaultContainerQuantity ?? 1),
                  waterRouteId: data.waterProfile.waterRouteId || null,
                  preferredRoute: data.waterProfile.preferredRoute || null,
                  deliveryInstructions: data.waterProfile.deliveryInstructions || null,
                },
              }
            : {}),
        },
      });
      navigate(`/clientes/${id}`);
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al actualizar",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-4">
        <MobilePage.Card variant="flat" className="w-full max-w-sm rounded-[28px]">
          <CardHeader className="text-center">
            <CardTitle>Cliente no encontrado</CardTitle>
            <CardDescription>
              El cliente que intentas editar no existe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/clientes">
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                Volver a clientes
              </Button>
            </Link>
          </CardContent>
        </MobilePage.Card>
      </div>
    );
  }

  return (
    <FormPage
      title="Editar Cliente"
      backHref={`/clientes/${id}`}
      toolbar={
        <>
          <Button
            onClick={() => navigate(`/clientes/${id}`)}
            variant="outline"
            className="w-full h-14 rounded-xl mb-3"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="customer-form"
            disabled={updateCustomer.isPending || !form.formState.isValid}
            className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
          >
            {updateCustomer.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </>
      }
    >
      <div className="max-w-md mx-auto space-y-4">
        <MobilePage.Card variant="flat">
          <CardHeader className="text-center">
            <div className="relative inline-block">
              <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.18)]">
                <User className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="mt-4">{customer.name}</CardTitle>
            <CardDescription>
              Actualiza la información del cliente
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FormProvider {...form}>
              <form id="customer-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CustomerFormContent customer={customer} />

                {form.formState.errors.root && (
                  <p className="text-sm text-destructive text-center">
                    {form.formState.errors.root.message}
                  </p>
                )}
              </form>
            </FormProvider>
          </CardContent>
        </MobilePage.Card>
      </div>
    </FormPage>
  );
}

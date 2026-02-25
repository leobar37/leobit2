import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import { useCustomer } from "~/hooks/use-customer";
import { useUpdateCustomer } from "~/hooks/use-customers-live";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";

const editCustomerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  dni: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type EditCustomerFormData = z.infer<typeof editCustomerSchema>;

console.log('[EditCustomerPage] Module loaded');

export default function EditCustomerPage() {
  console.log('[EditCustomerPage] Component rendering');
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id!);
  const updateCustomer = useUpdateCustomer();

  const form = useForm<EditCustomerFormData>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      name: "",
      dni: "",
      phone: "",
      address: "",
      notes: "",
    },
    values: customer
      ? {
          name: customer.name,
          dni: customer.dni || "",
          phone: customer.phone || "",
          address: customer.address || "",
          notes: customer.notes || "",
        }
      : undefined,
  });

  const onSubmit = async (data: EditCustomerFormData) => {
    if (!id) return;

    try {
      await updateCustomer.mutateAsync({
        id,
        data: {
          name: data.name,
          dni: data.dni || null,
          phone: data.phone || null,
          address: data.address || null,
          notes: data.notes || null,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-stone-100">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
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
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to={`/clientes/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Editar Cliente</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                  <User className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="mt-4">{customer.name}</CardTitle>
              <CardDescription>
                Actualiza la información del cliente
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormInput
                  label="Nombre"
                  error={form.formState.errors.name?.message}
                  {...form.register("name")}
                />

                <FormInput
                  label="DNI"
                  error={form.formState.errors.dni?.message}
                  {...form.register("dni")}
                />

                <FormInput
                  label="Teléfono"
                  error={form.formState.errors.phone?.message}
                  {...form.register("phone")}
                />

                <FormInput
                  label="Dirección"
                  error={form.formState.errors.address?.message}
                  {...form.register("address")}
                />

                <FormInput
                  label="Notas"
                  error={form.formState.errors.notes?.message}
                  {...form.register("notes")}
                />

                {form.formState.errors.root && (
                  <p className="text-sm text-destructive text-center">
                    {form.formState.errors.root.message}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
                  disabled={updateCustomer.isPending || !form.formState.isValid}
                >
                  {updateCustomer.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl"
                  onClick={() => navigate(`/clientes/${id}`)}
                >
                  Cancelar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useParams, useNavigate } from "react-router";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSupplier, useUpdateSupplier } from "~/hooks/use-suppliers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { FormPage } from "@/components/layout/form-page";

const editSupplierSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["generic", "regular", "internal"]),
  ruc: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

type EditSupplierFormData = z.infer<typeof editSupplierSchema>;

export default function EditSupplierPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useSupplier(id ?? null);
  const updateSupplier = useUpdateSupplier();

  const form = useForm<EditSupplierFormData>({
    resolver: zodResolver(editSupplierSchema),
    defaultValues: {
      name: "",
      type: "regular",
      ruc: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      isActive: true,
    },
    values: supplier
      ? {
          name: supplier.name,
          type: supplier.type,
          ruc: supplier.ruc || "",
          phone: supplier.phone || "",
          email: supplier.email || "",
          address: supplier.address || "",
          notes: supplier.notes || "",
          isActive: supplier.isActive,
        }
      : undefined,
  });

  const onSubmit = async (data: EditSupplierFormData) => {
    if (!id) return;

    try {
      await updateSupplier.mutateAsync({
        id,
        input: {
          name: data.name,
          type: data.type,
          ruc: data.ruc || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          notes: data.notes || undefined,
          isActive: data.isActive,
        },
      });
      toast.success("Proveedor actualizado");
      navigate(`/proveedores/${id}`);
    } catch (error) {
      console.error("Error updating supplier:", error);
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al actualizar",
      });
      toast.error("Error al actualizar el proveedor");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
          <CardHeader className="text-center">
            <CardTitle>Proveedor no encontrado</CardTitle>
            <CardDescription>
              El proveedor que intentas editar no existe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/proveedores">
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                Volver a proveedores
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FormPage
      title="Editar Proveedor"
      backHref={`/proveedores/${id}`}
      icon={Building2}
      toolbar={
        <>
          <Button
            onClick={() => navigate(`/proveedores/${id}`)}
            variant="outline"
            className="w-full h-14 rounded-xl mb-3"
          >
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateSupplier.isPending || !form.formState.isValid}
            className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
          >
            {updateSupplier.isPending ? (
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
        <Card className="border-0 shadow-lg rounded-3xl">
          <CardHeader className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="mt-4">{supplier.name}</CardTitle>
            <CardDescription>
              Actualiza la información del proveedor
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormInput
                label="Nombre"
                error={form.formState.errors.name?.message}
                {...form.register("name")}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de proveedor</label>
                <select
                  {...form.register("type")}
                  className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="regular">Regular</option>
                  <option value="internal">Interno</option>
                  <option value="generic">Genérico</option>
                </select>
              </div>

              <FormInput
                label="RUC"
                error={form.formState.errors.ruc?.message}
                {...form.register("ruc")}
              />

              <FormInput
                label="Teléfono"
                error={form.formState.errors.phone?.message}
                {...form.register("phone")}
              />

              <FormInput
                label="Email"
                type="email"
                error={form.formState.errors.email?.message}
                {...form.register("email")}
              />

              <FormInput
                label="Dirección"
                error={form.formState.errors.address?.message}
                {...form.register("address")}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Notas</label>
                <textarea
                  {...form.register("notes")}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register("isActive")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="text-sm font-medium">Activo</label>
              </div>

              {form.formState.errors.root && (
                <p className="text-sm text-destructive text-center">
                  {form.formState.errors.root.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </FormPage>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useParams, useNavigate } from "react-router";
import { Building2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormPage } from "~/components/layout/form-page";
import { useSupplier, useUpdateSupplier } from "~/hooks/use-suppliers";

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

export default function EditProveedorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useSupplier(id ?? null);
  const updateSupplier = useUpdateSupplier();

  const form = useForm<EditSupplierFormData>({
    resolver: zodResolver(editSupplierSchema),
    mode: "all",
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
          type: supplier.type as "generic" | "regular" | "internal",
          ruc: supplier.ruc || "",
          phone: supplier.phone || "",
          email: supplier.email || "",
          address: supplier.address || "",
          notes: supplier.notes || "",
          isActive: supplier.isActive,
        }
      : undefined,
  });

  const onSubmit = form.handleSubmit(async (data) => {
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
      navigate(`/proveedores/${id}`);
    } catch (error) {
      console.error("Error updating supplier:", error);
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al actualizar",
      });
    }
  });

  const isFormValid = form.formState.isValid;

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p>Proveedor no encontrado</p>
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
            onClick={onSubmit}
            disabled={updateSupplier.isPending || !isFormValid}
            className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
          >
            {updateSupplier.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Guardar cambios
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormInput
          name="name"
          label="Nombre del proveedor"
          placeholder="Ej: Granja El Sol"
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
          name="ruc"
          label="RUC"
          placeholder="Ej: 20123456789"
        />

        <FormInput
          name="phone"
          label="Teléfono"
          placeholder="Ej: 987654321"
        />

        <FormInput
          name="email"
          label="Email"
          type="email"
          placeholder="Ej: contacto@ejemplo.com"
        />

        <FormInput
          name="address"
          label="Dirección"
          placeholder="Ej: Av. Principal 123"
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Notas</label>
          <textarea
            {...form.register("notes")}
            rows={3}
            placeholder="Información adicional sobre el proveedor"
            className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            {...form.register("isActive")}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            Proveedor activo
          </label>
        </div>

        {form.formState.errors.root && (
          <p className="text-sm text-destructive text-center">
            {form.formState.errors.root.message}
          </p>
        )}
      </div>
    </FormPage>
  );
}

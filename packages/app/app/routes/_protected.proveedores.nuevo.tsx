import { useNavigate, useSearchParams } from "react-router";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { useCreateSupplier } from "~/hooks/use-suppliers";
import { FormPage } from "~/components/layout/form-page";

const supplierSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["regular", "internal"]),
  ruc: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function NuevoProveedorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/proveedores";
  const createSupplier = useCreateSupplier();

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      type: "regular",
      ruc: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await createSupplier.mutateAsync(data);
      navigate(returnTo && returnTo !== "/proveedores" ? returnTo : "/proveedores");
    } catch (error) {
      console.error("Error creating supplier:", error);
    }
  });

  const isFormValid = form.formState.isValid;

  return (
    <FormPage
      title="Nuevo Proveedor"
      backHref={returnTo && returnTo !== "/proveedores" ? returnTo : "/proveedores"}
      icon={Building2}
      toolbar={
        <Button
          onClick={onSubmit}
          disabled={createSupplier.isPending || !isFormValid}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {createSupplier.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Guardar Proveedor
            </>
          )}
        </Button>
      }
    >
      <FormProvider {...form}>
        <div className="space-y-4">
          <FormInput
            name="name"
            label="Nombre del proveedor"
            placeholder="Ej: Granja El Sol"
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tipo de proveedor
            </label>
            <select
              {...form.register("type")}
              className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="regular">Regular</option>
              <option value="internal">Interno</option>
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
        </div>
      </FormProvider>
    </FormPage>
  );
}

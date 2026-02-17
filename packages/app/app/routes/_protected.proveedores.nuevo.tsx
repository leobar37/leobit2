import { useNavigate } from "react-router";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { useCreateSupplier } from "~/hooks/use-suppliers";
import { useSetLayout } from "~/components/layout/app-layout";

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
  const { mutate: createSupplier, isPending } = useCreateSupplier();

  useSetLayout({
    title: "Nuevo Proveedor",
    showBackButton: true,
    backHref: "/proveedores",
  });

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

  const onSubmit = form.handleSubmit((data) => {
    createSupplier(data, {
      onSuccess: () => {
        navigate("/proveedores");
      },
    });
  });

  const isFormValid = form.formState.isValid;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
              <Building2 className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Registra un nuevo proveedor para tus compras
              </p>
            </div>
          </div>

          <FormInput
            name="name"
            label="Nombre del proveedor"
            placeholder="Ej: Granja El Sol"
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Notas
            </label>
            <textarea
              {...form.register("notes")}
              rows={3}
              placeholder="Información adicional sobre el proveedor"
              className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
          disabled={isPending || !isFormValid}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Proveedor
            </>
          )}
        </Button>
      </form>
    </FormProvider>
  );
}

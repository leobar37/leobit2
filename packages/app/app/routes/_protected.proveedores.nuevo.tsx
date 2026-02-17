import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      type: "regular",
    },
  });

  const onSubmit = handleSubmit((data) => {
    createSupplier(data, {
      onSuccess: () => {
        navigate("/proveedores");
      },
    });
  });

  return (
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

        <div className="space-y-2">
          <Label htmlFor="name">Nombre del proveedor *</Label>
          <Input
            id="name"
            placeholder="Ej: Granja El Sol"
            {...register("name")}
            className="rounded-xl"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Tipo de proveedor</Label>
          <select
            id="type"
            {...register("type")}
            value={watch("type")}
            className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
          >
            <option value="regular">Regular</option>
            <option value="internal">Interno</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruc">RUC</Label>
          <Input
            id="ruc"
            placeholder="Ej: 20123456789"
            {...register("ruc")}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            placeholder="Ej: 987654321"
            {...register("phone")}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Ej: contacto@ejemplo.com"
            {...register("email")}
            className="rounded-xl"
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Dirección</Label>
          <Input
            id="address"
            placeholder="Ej: Av. Principal 123"
            {...register("address")}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Información adicional sobre el proveedor"
            {...register("notes")}
            className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
        disabled={isPending}
      >
        {isPending ? "Guardando..." : "Guardar Proveedor"}
      </Button>
    </form>
  );
}

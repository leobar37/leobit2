import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, MapPin, CreditCard, FileText } from "lucide-react";
import type { Customer } from "~/lib/db/schema";

const customerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  onSubmit: (data: CustomerFormData) => void;
  isLoading?: boolean;
  customer?: Customer;
}

export function CustomerForm({ onSubmit, isLoading, customer }: CustomerFormProps) {
  const isEditing = !!customer;

  const formConfig = isEditing
    ? {
        values: {
          name: customer.name,
          dni: customer.dni,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
        },
      }
    : {
        defaultValues: {
          name: "",
          dni: null,
          phone: null,
          address: null,
          notes: null,
        },
      };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    ...formConfig,
  });

  return (
    <Card className="border-0 shadow-lg rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl">Información del Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Nombre *
          </Label>
          <Input
            id="name"
            placeholder="Nombre completo"
            {...register("name")}
            className="rounded-xl"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dni" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            DNI
          </Label>
          <Input
            id="dni"
            placeholder="12345678"
            {...register("dni")}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Teléfono
          </Label>
          <Input
            id="phone"
            placeholder="987654321"
            {...register("phone")}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Dirección
          </Label>
          <Input
            id="address"
            placeholder="Av. Principal 123"
            {...register("address")}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notas
          </Label>
          <textarea
            id="notes"
            placeholder="Notas adicionales sobre el cliente..."
            {...register("notes")}
            className="w-full min-h-[100px] px-3 py-2 rounded-xl border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>

        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
        >
          {isLoading
            ? "Guardando..."
            : isEditing
              ? "Guardar cambios"
              : "Guardar Cliente"}
        </Button>
      </CardContent>
    </Card>
  );
}

export type { CustomerFormData };

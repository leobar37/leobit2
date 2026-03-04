import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import type { Customer } from "~/lib/db/schema";
import type { UseFormReturn } from "react-hook-form";

export const customerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormContentProps {
  form: UseFormReturn<CustomerFormData>;
  customer?: Customer;
}

export function CustomerFormContent({ form, customer }: CustomerFormContentProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card className="border-0 shadow-lg rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl">
          {customer ? "Editar Cliente" : "Información del Cliente"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormInput
          label="Nombre"
          placeholder="Nombre completo"
          error={errors.name?.message}
          {...register("name")}
        />

        <FormInput
          label="Teléfono (opcional)"
          placeholder="987654321"
          {...register("phone")}
        />

        <FormInput
          label="Dirección (opcional)"
          placeholder="Av. Principal 123"
          {...register("address")}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">
            Notas (opcional)
          </label>
          <textarea
            placeholder="Notas adicionales sobre el cliente..."
            {...register("notes")}
            className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>

        <FormInput
          label="DNI (opcional)"
          placeholder="12345678"
          {...register("dni")}
        />
      </CardContent>
    </Card>
  );
}

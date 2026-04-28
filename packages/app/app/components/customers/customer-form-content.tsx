import { useFormContext } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import type { Customer } from "@avileo/shared";

export const customerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormContentProps {
  customer?: Customer;
}

export function CustomerFormContent({ customer }: CustomerFormContentProps) {
  const { register } = useFormContext();

  return (
    <Card className="border-0 shadow-lg rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl">
          {customer ? "Editar Cliente" : "Información del Cliente"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormInput
          name="name"
          label="Nombre"
          placeholder="Nombre completo"
        />

        <FormInput
          name="phone"
          label="Teléfono (opcional)"
          placeholder="987654321"
        />

        <FormInput
          name="address"
          label="Dirección (opcional)"
          placeholder="Av. Principal 123"
        />

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">
            Notas (opcional)
          </label>
          <textarea
            {...register("notes")}
            placeholder="Notas adicionales sobre el cliente..."
            className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>

        <FormInput
          name="dni"
          label="DNI (opcional)"
          placeholder="12345678"
        />
      </CardContent>
    </Card>
  );
}

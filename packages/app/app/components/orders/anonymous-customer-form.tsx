import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { User, Phone } from "lucide-react";

const anonymousCustomerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
});

export type AnonymousCustomerFormData = z.infer<typeof anonymousCustomerSchema>;

interface AnonymousCustomerFormProps {
  onSubmit: (data: AnonymousCustomerFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<AnonymousCustomerFormData>;
}

export function AnonymousCustomerForm({
  onSubmit,
  isLoading,
  defaultValues,
}: AnonymousCustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<AnonymousCustomerFormData>({
    resolver: zodResolver(anonymousCustomerSchema),
    mode: "onChange",
    defaultValues: {
      name: defaultValues?.name || "",
      phone: defaultValues?.phone || "",
    },
  });

  return (
    <Card className="border-0 shadow-lg rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <User className="h-5 w-5 text-orange-500" />
          Datos del cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormInput
          label="Nombre"
          placeholder="Ingresa tu nombre"
          error={errors.name?.message}
          {...register("name")}
          className="rounded-xl"
        />

        <FormInput
          label="Teléfono"
          type="tel"
          placeholder="987654321"
          error={errors.phone?.message}
          helperText="Opcional - para contactarte sobre tu pedido"
          {...register("phone")}
          className="rounded-xl"
        />

        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading || !isValid}
          className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 h-12 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {isLoading ? "Confirmando..." : "Confirmar pedido"}
        </Button>
      </CardContent>
    </Card>
  );
}

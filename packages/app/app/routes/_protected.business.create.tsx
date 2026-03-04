import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { Store, Loader2 } from "lucide-react";
import { useCreateBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { FormPage } from "~/components/layout/form-page";

const createBusinessSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  ruc: z.string().max(20).optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
});

type CreateBusinessFormData = z.infer<typeof createBusinessSchema>;

export default function CreateBusinessPage() {
  const navigate = useNavigate();
  const createBusiness = useCreateBusiness();

  const form = useForm<CreateBusinessFormData>({
    resolver: zodResolver(createBusinessSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      ruc: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = async (data: CreateBusinessFormData) => {
    try {
      const input = {
        name: data.name,
        ruc: data.ruc || undefined,
        address: data.address || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
      };

      await createBusiness.mutateAsync(input);
      navigate("/dashboard");
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al crear negocio",
      });
    }
  };

  return (
    <FormPage
      title="Crear tu negocio"
      backHref="/"
      maxWidth="sm"
      toolbar={
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={createBusiness.isPending || !form.formState.isValid}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {createBusiness.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creando negocio...
            </>
          ) : (
            "Crear negocio"
          )}
        </Button>
      }
    >
      <Card className="border-0 shadow-lg rounded-3xl">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Store className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Crear tu negocio
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configura tu negocio para comenzar a vender
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormInput
              label="Nombre del negocio"
              placeholder="Ej: Pollería El Sabor"
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />

            <FormInput
              label="RUC (opcional)"
              placeholder="20123456789"
              error={form.formState.errors.ruc?.message}
              {...form.register("ruc")}
            />

            <FormInput
              label="Dirección (opcional)"
              placeholder="Av. Principal 123"
              error={form.formState.errors.address?.message}
              {...form.register("address")}
            />

            <FormInput
              label="Teléfono (opcional)"
              placeholder="987654321"
              error={form.formState.errors.phone?.message}
              {...form.register("phone")}
            />

            <FormInput
              label="Email del negocio (opcional)"
              type="email"
              placeholder="contacto@tunegocio.com"
              error={form.formState.errors.email?.message}
              {...form.register("email")}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive text-center">
                {form.formState.errors.root.message}
              </p>
            )}
          </CardContent>
        </form>
      </Card>
    </FormPage>
  );
}

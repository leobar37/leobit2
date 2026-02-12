import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { ArrowLeft, Store, Camera, Loader2 } from "lucide-react";
import {
  useBusiness,
  useUpdateBusiness,
  useUploadBusinessLogo,
} from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { useRef, useState } from "react";


const updateBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  ruc: z.string().max(20).optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  modoOperacion: z.enum([
    "inventario_propio",
    "sin_inventario",
    "pedidos",
    "mixto",
  ]),
  controlKilos: z.boolean(),
  usarDistribucion: z.boolean(),
  permitirVentaSinStock: z.boolean(),
});

type UpdateBusinessFormData = z.infer<typeof updateBusinessSchema>;

export default function EditBusinessPage() {
  const { data: business, isLoading } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const uploadLogo = useUploadBusinessLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<UpdateBusinessFormData>({
    resolver: zodResolver(updateBusinessSchema),
    defaultValues: {
      name: "",
      ruc: "",
      address: "",
      phone: "",
      email: "",
      modoOperacion: "inventario_propio",
      controlKilos: true,
      usarDistribucion: true,
      permitirVentaSinStock: false,
    },
    values: business
      ? {
          name: business.name,
          ruc: business.ruc || "",
          address: business.address || "",
          phone: business.phone || "",
          email: business.email || "",
          modoOperacion: (business.modoOperacion as "inventario_propio" | "sin_inventario" | "pedidos" | "mixto") || "inventario_propio",
          controlKilos: business.controlKilos,
          usarDistribucion: business.usarDistribucion,
          permitirVentaSinStock: business.permitirVentaSinStock,
        }
      : undefined,
  });

  const onSubmit = async (data: UpdateBusinessFormData) => {
    if (!business) return;

    try {
      await updateBusiness.mutateAsync({
        id: business.id,
        input: {
          name: data.name,
          ruc: data.ruc || undefined,
          address: data.address || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          modoOperacion: data.modoOperacion,
          controlKilos: data.controlKilos,
          usarDistribucion: data.usarDistribucion,
          permitirVentaSinStock: data.permitirVentaSinStock,
        },
      });
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Error al actualizar",
      });
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business) return;

    setIsUploading(true);
    try {
      await uploadLogo.mutateAsync({ id: business.id, file });
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
          <CardHeader className="text-center">
            <CardTitle>No tienes un negocio</CardTitle>
            <CardDescription>
              Crea un negocio para comenzar a usar el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/business/create">
              <Button className="w-full">Crear negocio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Mi Negocio</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader className="text-center">
              <div className="relative inline-block">
                <div
                  className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden shadow-lg"
                  onClick={handleLogoClick}
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="h-10 w-10 text-white" />
                  )}
                </div>
                <button
                  className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-orange-100"
                  onClick={handleLogoClick}
                  type="button"
                >
                  <Camera className="h-4 w-4 text-orange-600" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <CardTitle className="mt-4">{business.name}</CardTitle>
              <CardDescription>
                {business.role === "ADMIN_NEGOCIO" ? "Administrador" : "Vendedor"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormInput
                  label="Nombre del negocio"
                  error={form.formState.errors.name?.message}
                  {...form.register("name")}
                />

                <FormInput
                  label="RUC"
                  error={form.formState.errors.ruc?.message}
                  {...form.register("ruc")}
                />

                <FormInput
                  label="Dirección"
                  error={form.formState.errors.address?.message}
                  {...form.register("address")}
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

                {form.formState.errors.root && (
                  <p className="text-sm text-destructive text-center">
                    {form.formState.errors.root.message}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
                  disabled={updateBusiness.isPending}
                >
                  {updateBusiness.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

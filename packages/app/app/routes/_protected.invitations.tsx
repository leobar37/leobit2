import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Copy, X, Loader2, UserPlus } from "lucide-react";
import { useInvitations, useCreateInvitation, useCancelInvitation } from "@/hooks/use-invitations";
import { useBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FormInput } from "@/components/forms/form-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Invitation } from "@avileo/shared";

const createInvitationSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  salesPoint: z.string().optional(),
});

type CreateInvitationFormData = z.infer<typeof createInvitationSchema>;

function InvitationCard({
  invitation,
  onCancel,
}: {
  invitation: Invitation;
  onCancel: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(invitation.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "accepted":
        return "Aceptada";
      case "cancelled":
        return "Cancelada";
      case "expired":
        return "Expirada";
      default:
        return status;
    }
  };

  return (
    <Card className="border-0 shadow-md rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(
                  invitation.status
                )}`}
              >
                {getStatusLabel(invitation.status)}
              </span>
              {invitation.salesPoint && (
                <span className="text-xs text-muted-foreground">
                  {invitation.salesPoint}
                </span>
              )}
            </div>
            <p className="font-semibold">{invitation.inviteeName}</p>
            <p className="text-sm text-muted-foreground">{invitation.email}</p>
            {invitation.status === "pending" && (
              <div className="mt-3 flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                  {invitation.token}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={copyCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {copied && (
                  <span className="text-xs text-green-600">¡Copiado!</span>
                )}
              </div>
            )}
          </div>
          {invitation.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive"
              onClick={() => onCancel(invitation.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvitationsPage() {
  const { data: business } = useBusiness();
  const { data: invitations, isLoading } = useInvitations();
  const createInvitation = useCreateInvitation();
  const cancelInvitation = useCancelInvitation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CreateInvitationFormData>({
    resolver: zodResolver(createInvitationSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      name: "",
      salesPoint: "",
    },
  });

  const onSubmit = async (data: CreateInvitationFormData) => {
    try {
      await createInvitation.mutateAsync({
        email: data.email,
        name: data.name,
        salesPoint: data.salesPoint || undefined,
      });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Error al crear invitación",
      });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelInvitation.mutateAsync(id);
    } catch (error) {
      console.error("Error cancelling invitation:", error);
    }
  };

  if (business?.role !== "ADMIN_NEGOCIO") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
          <CardHeader className="text-center">
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>
              Solo los administradores pueden gestionar invitaciones
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground flex-1">
            Invitaciones
          </span>
          <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DrawerTrigger asChild>
              <Button size="sm" className="rounded-xl">
                <Plus className="h-4 w-4 mr-1" />
                Invitar
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Invitar vendedor</DrawerTitle>
                <DrawerDescription>
                  Crea una invitación para unir un vendedor a tu negocio
                </DrawerDescription>
              </DrawerHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormInput
                  label="Nombre del vendedor"
                  placeholder="Ej: Juan Pérez"
                  error={form.formState.errors.name?.message}
                  {...form.register("name")}
                />
                <FormInput
                  label="Email"
                  type="email"
                  placeholder="vendedor@email.com"
                  error={form.formState.errors.email?.message}
                  {...form.register("email")}
                />
                <FormInput
                  label="Punto de venta (opcional)"
                  placeholder="Ej: Carro A, Casa, etc."
                  error={form.formState.errors.salesPoint?.message}
                  {...form.register("salesPoint")}
                />
                {form.formState.errors.root && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createInvitation.isPending || !form.formState.isValid}
                >
                  {createInvitation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear invitación"
                  )}
                </Button>
              </form>
            </DrawerContent>
          </Drawer>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : invitations?.length === 0 ? (
            <Card className="border-0 shadow-lg rounded-3xl">
              <CardContent className="p-8 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-lg mb-2">
                  No hay invitaciones
                </CardTitle>
                <CardDescription>
                  Crea una invitación para unir vendedores a tu negocio
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invitations?.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

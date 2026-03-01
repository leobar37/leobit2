import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Users, Pencil, UserX, Loader2, Store } from "lucide-react";
import { useTeam, useUpdateTeamMember, useDeactivateTeamMember } from "@/hooks/use-team";
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
} from "@/components/ui/drawer";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { FormInput } from "@/components/forms/form-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TeamMember } from "@avileo/shared";

const updateMemberSchema = z.object({
  role: z.enum(["ADMIN_NEGOCIO", "VENDEDOR"]),
  salesPoint: z.string().optional(),
});

type UpdateMemberFormData = z.infer<typeof updateMemberSchema>;

function TeamMemberCard({
  member,
  onEdit,
  onDeactivate,
}: {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
  onDeactivate: (id: string) => void;
}) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN_NEGOCIO":
        return "Administrador";
      case "VENDEDOR":
        return "Vendedor";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN_NEGOCIO":
        return "bg-purple-100 text-purple-800";
      case "VENDEDOR":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="border-0 shadow-md rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${getRoleColor(
                  member.role
                )}`}
              >
                {getRoleLabel(member.role)}
              </span>
              {member.salesPoint && (
                <span className="text-xs text-muted-foreground">
                  {member.salesPoint}
                </span>
              )}
              {!member.isActive && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">
                  Inactivo
                </span>
              )}
            </div>
            <p className="font-semibold">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(member)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {member.isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive"
                onClick={() => onDeactivate(member.id)}
              >
                <UserX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamPage() {
  const { data: business } = useBusiness();
  const { data: team, isLoading } = useTeam();
  const updateMember = useUpdateTeamMember();
  const deactivateMember = useDeactivateTeamMember();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<UpdateMemberFormData>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      role: "VENDEDOR",
      salesPoint: "",
    },
  });

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    form.reset({
      role: member.role,
      salesPoint: member.salesPoint || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({
      title: "Desactivar miembro",
      description: "¿Estás seguro de desactivar este miembro? Esta acción no se puede deshacer.",
      confirmText: "Desactivar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deactivateMember.mutateAsync(id);
      } catch (error) {
        console.error("Error deactivating member:", error);
      }
    }
  };

  const onSubmit = async (data: UpdateMemberFormData) => {
    if (!editingMember) return;

    try {
      await updateMember.mutateAsync({
        id: editingMember.id,
        input: data,
      });
      setIsDialogOpen(false);
      setEditingMember(null);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Error al actualizar miembro",
      });
    }
  };

  if (business?.role !== "ADMIN_NEGOCIO") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-3xl">
          <CardHeader className="text-center">
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>
              Solo los administradores pueden gestionar el equipo
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
            Mi Equipo
          </span>
          <Link to="/invitations">
            <Button size="sm" className="rounded-xl">
              <Store className="h-4 w-4 mr-1" />
              Invitar
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : team?.length === 0 ? (
            <Card className="border-0 shadow-lg rounded-3xl">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-lg mb-2">No hay miembros</CardTitle>
                <CardDescription>
                  Invita a tu primer vendedor para empezar
                </CardDescription>
                <Link to="/invitations" className="mt-4 inline-block">
                  <Button>Ir a invitaciones</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {team?.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onEdit={handleEdit}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Editar miembro</DrawerTitle>
            <DrawerDescription>
              Actualiza el rol o punto de venta de {editingMember?.name}
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rol</label>
              <select
                value={form.watch("role")}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  form.setValue("role", e.target.value as "ADMIN_NEGOCIO" | "VENDEDOR")
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="ADMIN_NEGOCIO">Administrador</option>
                <option value="VENDEDOR">Vendedor</option>
              </select>
            </div>

            <FormInput
              label="Punto de venta"
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
              disabled={updateMember.isPending || !form.formState.isValid}
            >
              {updateMember.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog />
    </div>
  );
}

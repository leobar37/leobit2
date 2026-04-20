// @ts-nocheck - Route file with complex type errors
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  User,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCustomerGroup,
  useDeleteCustomerGroup,
  type GroupMember,
} from "~/hooks/use-grupos";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { formatDate } from "~/lib/formatting";

function SyncBadge({ status }: { status: "pending" | "synced" | "error" }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    synced: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  const labels = {
    pending: "Pendiente",
    synced: "Sincronizado",
    error: "Error",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: group, isLoading: groupLoading } = useCustomerGroup(id ?? null);
  const deleteGroup = useDeleteCustomerGroup();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const handleDelete = async () => {
    if (!group) return;

    const confirmed = await confirm({
      title: "Eliminar grupo",
      description: `¿Estás seguro de eliminar el grupo "${group.name}"? Esta acción no se puede deshacer y eliminará todos los miembros asociados.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteGroup.mutateAsync({ id: id! });
        navigate("/grupos");
      } catch (error) {
        console.error("Error deleting group:", error);
        toast.error("Error al eliminar el grupo");
      }
    }
  };

  const members = useMemo<GroupMember[]>(
    () => group?.members || [],
    [group?.members]
  );

  if (groupLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p>Cargando grupo...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p>Grupo no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell">
      <header className="sticky top-0 z-50 border-b shell-surface">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
          <button
            onClick={() => navigate(-1)}
            className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold">{group.name}</h1>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="rounded-2xl p-2 text-red-600 transition-colors hover:bg-white/70"
              title="Eliminar grupo"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <Link
              to={`/grupos/${id}/edit`}
              className="rounded-2xl p-2 transition-colors hover:bg-white/70"
            >
              <Pencil className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-3 py-4 pb-32 sm:px-4">
        <Card className="shell-card-flat rounded-[28px]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] bg-orange-100/90 ring-1 ring-orange-100">
                <Users className="h-7 w-7 text-orange-600" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold">{group.name}</h2>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {group.memberCount || 0} miembro
                      {(group.memberCount || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Creado: {formatDate(group.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SyncBadge status={group.syncStatus as "pending" | "synced" | "error"} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="shell-card-flat overflow-hidden rounded-[28px]">
          <div className="flex items-center justify-between border-b px-4 py-3 shell-divider">
            <h3 className="font-semibold">Miembros del grupo</h3>
            <span className="text-sm text-muted-foreground">
              {members.length} total
            </span>
          </div>

          <div className="space-y-3 p-4">
            {members.length === 0 ? (
              <div className="py-8 text-center">
                <User className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No hay miembros en este grupo</p>
                <Button
                  asChild
                  className="mt-4 bg-orange-500 hover:bg-orange-600"
                >
                  <Link to={`/grupos?id=${id}&tab=members`}>
                    Agregar miembros
                  </Link>
                </Button>
              </div>
            ) : (
              members.map((member) => (
                <Link
                  key={member.customerId}
                  to={`/clientes/${member.customerId}`}
                  className="shell-card-soft flex items-center gap-3 rounded-[20px] p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-100">
                    <User className="h-5 w-5 text-stone-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{member.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      Agregado: {formatDate(member.addedAt)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog />
    </div>
  );
}

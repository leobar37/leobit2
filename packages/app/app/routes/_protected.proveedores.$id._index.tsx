import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSupplier, useDeleteSupplier } from "~/hooks/use-suppliers";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";

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

const typeLabels: Record<string, string> = {
  generic: "Genérico",
  regular: "Regular",
  internal: "Interno",
};

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: supplier, isLoading: supplierLoading } = useSupplier(id ?? null);
  const deleteSupplier = useDeleteSupplier();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const handleDelete = async () => {
    if (!supplier) return;

    const confirmed = await confirm({
      title: "Eliminar proveedor",
      description: `¿Estás seguro de eliminar a ${supplier.name}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteSupplier.mutateAsync(id!);
        toast.success("Proveedor eliminado");
        navigate("/proveedores");
      } catch (error) {
        console.error("Error deleting supplier:", error);
        toast.error("Error al eliminar el proveedor");
      }
    }
  };

  if (supplierLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p>Cargando proveedor...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p>Proveedor no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 -ml-2 hover:bg-orange-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold">{supplier.name}</h1>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="rounded-xl p-2 text-red-600 hover:bg-red-50"
              title="Eliminar proveedor"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <Link
              to={`/proveedores/${id}/edit`}
              className="rounded-xl p-2 hover:bg-orange-50"
            >
              <Pencil className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-3 py-4 pb-32 sm:px-4">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100">
                {supplier.type === "generic" ? (
                  <Building2 className="h-7 w-7 text-orange-600" />
                ) : (
                  <User className="h-7 w-7 text-orange-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold">{supplier.name}</h2>
                  <SyncBadge status={supplier.syncStatus} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {typeLabels[supplier.type]}
                </p>

                {!supplier.isActive && (
                  <span className="mt-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Inactivo
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="space-y-4 p-4">
            <h3 className="font-semibold">Información de contacto</h3>

            <div className="space-y-3">
              {supplier.ruc && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">RUC</p>
                    <p className="font-medium">{supplier.ruc}</p>
                  </div>
                </div>
              )}

              {supplier.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <Phone className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{supplier.phone}</p>
                  </div>
                </div>
              )}

              {supplier.email && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <Mail className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{supplier.email}</p>
                  </div>
                </div>
              )}

              {supplier.address && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <MapPin className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="font-medium">{supplier.address}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {supplier.notes && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Notas</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {supplier.notes}
              </p>
            </CardContent>
          </Card>
        )}

        <Button
          asChild
          className="h-12 w-full rounded-xl bg-orange-500 hover:bg-orange-600"
        >
          <Link to={`/compras/nuevo?proveedorId=${id}`}>
            Registrar compra
          </Link>
        </Button>

        <ConfirmDialog />
      </main>
    </div>
  );
}

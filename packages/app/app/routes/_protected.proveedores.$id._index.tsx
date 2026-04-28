import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSupplier, useDeleteSupplier } from "~/hooks/use-suppliers";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { formatDate } from "~/lib/formatting";

export default function ProveedorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: supplier, isLoading } = useSupplier(id ?? null);
  const deleteSupplier = useDeleteSupplier();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Eliminar proveedor",
      description: `¿Estás seguro de eliminar a ${supplier?.name}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteSupplier.mutateAsync(id!);
        navigate("/proveedores");
      } catch (error) {
        console.error("Error deleting supplier:", error);
        toast.error("Error al eliminar el proveedor");
      }
    }
  };

  const typeLabels = {
    generic: "Genérico",
    regular: "Regular",
    internal: "Interno",
  };

  const typeColors = {
    generic: "bg-gray-100 text-gray-700",
    regular: "bg-blue-100 text-blue-700",
    internal: "bg-purple-100 text-purple-700",
  };

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p>Cargando proveedor...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p>Proveedor no encontrado</p>
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
          <h1 className="truncate text-lg font-bold">{supplier.name}</h1>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="rounded-2xl p-2 text-red-600 transition-colors hover:bg-white/70"
              title="Eliminar proveedor"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <Link
              to={`/proveedores/${id}/edit`}
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
                {supplier.type === "generic" ? (
                  <Building2 className="h-7 w-7 text-orange-600" />
                ) : (
                  <Truck className="h-7 w-7 text-orange-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold">{supplier.name}</h2>
                  <Badge variant="secondary" className={typeColors[supplier.type as keyof typeof typeColors] || typeColors.generic}>
                    {typeLabels[supplier.type as keyof typeof typeLabels] || typeLabels.generic}
                  </Badge>
                  {!supplier.isActive && (
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                      Inactivo
                    </Badge>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {supplier.ruc && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>RUC: {supplier.ruc}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Email: {supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {supplier.notes && (
          <Card className="shell-card-flat rounded-[28px]">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Notas</h3>
              <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card className="shell-card-flat rounded-[28px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Creado el {formatDate(supplier.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <ConfirmDialog />
      </main>
    </div>
  );
}

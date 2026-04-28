import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle, Store, UserRound, Loader2 } from "lucide-react";
import type { Distribucion } from "~/hooks/use-distribuciones";
import type { DistribucionItem } from "~/lib/services/distribucion-service";
import { cn, formatKilos as formatKilosUtil } from "~/lib/utils";

interface DistribucionTableProps {
  distribuciones: Distribucion[];
  onEdit: (distribucion: Distribucion) => void;
  onClose: (distribucion: Distribucion) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  deletingId?: string | null;
}

type DistribucionListItem = Distribucion & {
  vendedorName?: string | null;
  items?: DistribucionItem[];
};

export function DistribucionTable({
  distribuciones,
  onEdit,
  onClose,
  onDelete,
  isLoading,
  deletingId,
}: DistribucionTableProps) {
  const getVendedorLabel = (dist: DistribucionListItem) => dist.vendedorName?.trim() || "Vendedor no disponible";

  const hasItems = (dist: DistribucionListItem) =>
    (dist.items?.length ?? 0) > 0;

  const getStatusBadge = (estado: Distribucion["estado"]) => {
    const config =
      estado === "cerrado"
        ? { variant: "outline" as const, label: "Cerrado" }
        : estado === "en_ruta"
          ? { variant: "secondary" as const, label: "En ruta" }
          : { variant: "default" as const, label: "Activo" };

    return (
      <Badge variant={config.variant} className="gap-1">
        {config.label}
      </Badge>
    );
  };

  const getStatusClasses = (estado: Distribucion["estado"]) => {
    if (estado === "cerrado") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (estado === "en_ruta") {
      return "border-sky-200 bg-sky-50 text-sky-700";
    }

    return "border-orange-200 bg-orange-50 text-orange-700";
  };

  if (isLoading) {
    return (
      <div className="shell-card-flat rounded-[28px] border-stone-200/85 p-8 text-center text-muted-foreground">
        Cargando distribuciones...
      </div>
    );
  }

  if (distribuciones.length === 0) {
    return (
      <div className="shell-card-flat rounded-[28px] border-stone-200/85 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
          <Store className="h-5 w-5" />
        </div>
        <p className="mt-4 text-base font-medium text-foreground">No hay distribuciones para mostrar</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando asignes una ruta o punto de venta, aparecerá aquí con su avance diario.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {distribuciones.map((dist) => {
          const vendedorLabel = getVendedorLabel(dist as DistribucionListItem);

          return (
            <div key={dist.id} className="shell-card-flat rounded-[24px] border-stone-200/85 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{vendedorLabel}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="h-4 w-4 text-orange-500" />
                    <span className="truncate">{dist.puntoVenta}</span>
                  </div>
                </div>

                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                    getStatusClasses(dist.estado),
                  )}
                >
                  {dist.estado === "en_ruta"
                    ? "En ruta"
                    : dist.estado === "cerrado"
                      ? "Cerrado"
                      : "Activo"}
                </span>
              </div>

              {hasItems(dist as DistribucionListItem) ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="shell-block-muted rounded-[18px] p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Asignado</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatKilosUtil((dist as DistribucionListItem).items?.reduce((sum: number, item: DistribucionItem) => sum + Number(item.cantidadAsignada || 0), 0) || 0)} kg
                    </p>
                  </div>
                  <div className="shell-block-muted rounded-[18px] p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Vendido</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatKilosUtil((dist as DistribucionListItem).items?.reduce((sum: number, item: DistribucionItem) => sum + Number(item.cantidadVendida || 0), 0) || 0)} kg
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 shell-block-muted rounded-[18px] p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Productos</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Sin productos asignados</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-stone-200 bg-white/80"
                  onClick={() => onEdit(dist)}
                >
                  <Edit className="mr-1.5 h-4 w-4" />
                  Editar
                </Button>

                {dist.estado !== "cerrado" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => onClose(dist)}
                  >
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Cerrar
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  onClick={() => onDelete(dist.id)}
                  disabled={deletingId === dist.id}
                >
                  {deletingId === dist.id ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-4 w-4" />
                  )}
                  {deletingId === dist.id ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-[28px] border border-stone-200/85 bg-white/70 lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead>Punto de venta</TableHead>
              <TableHead className="text-right">Asignado</TableHead>
              <TableHead className="text-right">Vendido</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distribuciones.map((dist) => {
              const vendedorLabel = getVendedorLabel(dist as DistribucionListItem);

              return (
                <TableRow key={dist.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <span>{vendedorLabel}</span>
                    </div>
                  </TableCell>
                  <TableCell>{dist.puntoVenta}</TableCell>
                  <TableCell className="text-right">
                    {hasItems(dist as DistribucionListItem)
                      ? `${formatKilosUtil((dist as DistribucionListItem).items?.reduce((sum: number, item: DistribucionItem) => sum + Number(item.cantidadAsignada || 0), 0) || 0)} kg`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {hasItems(dist as DistribucionListItem)
                      ? `${formatKilosUtil((dist as DistribucionListItem).items?.reduce((sum: number, item: DistribucionItem) => sum + Number(item.cantidadVendida || 0), 0) || 0)} kg`
                      : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(dist.estado)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(dist)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {dist.estado !== "cerrado" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onClose(dist)}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDelete(dist.id)}
                        disabled={deletingId === dist.id}
                      >
                        {deletingId === dist.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

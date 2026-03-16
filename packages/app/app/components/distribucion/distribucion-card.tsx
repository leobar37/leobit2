import { Truck, Edit, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatKilos } from "~/lib/utils";
import type { Distribucion } from "~/hooks/use-distribuciones";

interface DistribucionCardProps {
  distribucion: Distribucion;
  onEdit?: (distribucion: Distribucion) => void;
  onClose?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusConfig: Record<
  Distribucion["estado"],
  { label: string; className: string }
> = {
  activo: { label: "Activo", className: "bg-green-100 text-green-700" },
  en_ruta: { label: "En ruta", className: "bg-blue-100 text-blue-700" },
  cerrado: { label: "Cerrado", className: "bg-gray-100 text-gray-700" },
};

/**
 * Card component for displaying distribution information.
 * Replaces the table view with a mobile-friendly card layout.
 * Uses shell-card-flat styling for consistency.
 */
export function DistribucionCard({
  distribucion,
  onEdit,
  onClose,
  onDelete,
}: DistribucionCardProps) {
  const status = statusConfig[distribucion.estado];
  const isClosed = distribucion.estado === "cerrado";

  return (
    <Card className="shell-card-flat w-full rounded-[24px] transition-colors hover:border-stone-300/90">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-orange-100/90 ring-1 ring-orange-100">
            <Truck className="h-6 w-6 text-orange-600" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-[1.05rem] font-semibold leading-tight text-foreground">
                  {distribucion.vendedorName}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {distribucion.puntoVenta}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold leading-none",
                  status.className
                )}
              >
                {status.label}
              </Badge>
            </div>

            {/* Stats row */}
            <div className="mt-3 grid grid-cols-2 gap-4 border-t shell-divider pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Asignado</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatKilos(distribucion.kilosAsignados, 1)} kg
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendido</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatKilos(distribucion.kilosVendidos, 1)} kg
                </p>
              </div>
            </div>

            {/* Actions row */}
            <div className="mt-3 flex items-center justify-end gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(distribucion)}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
              {!isClosed && onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => onClose(distribucion.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Cerrar
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(distribucion.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

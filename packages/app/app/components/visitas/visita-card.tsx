import { Clock, CheckCircle, XCircle, X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "~/lib/utils";
import type { Visita } from "~/hooks/use-visitas";

export type VisitaStatus = "pendiente" | "compro" | "no_compra";

interface StatusConfig {
  bg: string;
  border: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}

const statusConfig: Record<VisitaStatus, StatusConfig> = {
  pendiente: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: Clock,
  },
  compro: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: CheckCircle,
  },
  no_compra: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: XCircle,
  },
};

const statusLabels: Record<VisitaStatus, string> = {
  pendiente: "Pendiente",
  compro: "Compró",
  no_compra: "No compró",
};

interface VisitaCardProps {
  visita: Visita;
  onMarkAsNotPurchased: (visita: Visita) => void;
  onGenerateSale: (visita: Visita) => void;
}

export function VisitaCard({
  visita,
  onMarkAsNotPurchased,
  onGenerateSale,
}: VisitaCardProps) {
  const config = statusConfig[visita.status];
  const StatusIcon = config.icon;

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-colors",
        config.border
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          config.bg.replace("bg-", "bg-")
        )}
      />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1.05rem] font-semibold text-foreground">
            {visita.customer?.name || "Cliente"}
          </p>
          {visita.customer?.dni && (
            <p className="text-sm text-muted-foreground">
              DNI: {visita.customer.dni}
            </p>
          )}
          {visita.motivoNoCompra && (
            <p className="mt-1 text-sm text-red-600">
              Motivo: {visita.motivoNoCompra}
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            config.bg,
            config.text
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {statusLabels[visita.status]}
        </div>
      </div>

      {visita.status === "pendiente" && (
        <div className="mt-3 flex gap-2 pl-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onMarkAsNotPurchased(visita)}
          >
            <X className="mr-1 h-4 w-4" />
            No compró
          </Button>
          <Button
            size="sm"
            className="flex-1 border-orange-200 bg-orange-500 text-white hover:bg-orange-600"
            onClick={() => onGenerateSale(visita)}
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            Generar venta
          </Button>
        </div>
      )}
    </Card>
  );
}

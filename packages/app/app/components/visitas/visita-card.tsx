import { Clock, CheckCircle, XCircle, X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import type { Visita } from "~/hooks/use-visitas";

export type VisitaStatus = "pendiente" | "compro" | "no_compra";

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  leftBar: string;
}

const statusConfig: Record<VisitaStatus, StatusConfig> = {
  pendiente: {
    icon: Clock,
    badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    badgeText: "text-yellow-700 dark:text-yellow-300",
    badgeBorder: "border-yellow-500/20 dark:border-yellow-400/30",
    leftBar: "bg-yellow-500",
  },
  compro: {
    icon: CheckCircle,
    badgeBg: "bg-green-500/10 dark:bg-green-500/15",
    badgeText: "text-green-700 dark:text-green-300",
    badgeBorder: "border-green-500/20 dark:border-green-400/30",
    leftBar: "bg-green-500",
  },
  no_compra: {
    icon: XCircle,
    badgeBg: "bg-red-500/10 dark:bg-red-500/15",
    badgeText: "text-red-700 dark:text-red-300",
    badgeBorder: "border-red-500/20 dark:border-red-400/30",
    leftBar: "bg-red-500",
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
    <div
      className={cn(
        "shell-card-flat relative overflow-hidden rounded-[24px] border p-4 transition-colors",
        "border-stone-200/85 dark:border-white/10"
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          config.leftBar
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
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Motivo: {visita.motivoNoCompra}
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
            config.badgeBg,
            config.badgeText,
            config.badgeBorder
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
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            onClick={() => onMarkAsNotPurchased(visita)}
          >
            <X className="mr-1 h-4 w-4" />
            No compró
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
            onClick={() => onGenerateSale(visita)}
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            Generar venta
          </Button>
        </div>
      )}
    </div>
  );
}

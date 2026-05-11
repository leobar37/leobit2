import { X, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import type { Visita } from "~/hooks/use-visitas";

export type VisitaStatus = "pendiente" | "compro" | "no_compra";

interface StatusConfig {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dot: string;
}

const statusConfig: Record<VisitaStatus, StatusConfig> = {
  pendiente: {
    badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    badgeText: "text-yellow-700 dark:text-yellow-300",
    badgeBorder: "border-yellow-500/20 dark:border-yellow-400/30",
    dot: "bg-yellow-500",
  },
  compro: {
    badgeBg: "bg-green-500/10 dark:bg-green-500/15",
    badgeText: "text-green-700 dark:text-green-300",
    badgeBorder: "border-green-500/20 dark:border-green-400/30",
    dot: "bg-green-500",
  },
  no_compra: {
    badgeBg: "bg-red-500/10 dark:bg-red-500/15",
    badgeText: "text-red-700 dark:text-red-300",
    badgeBorder: "border-red-500/20 dark:border-red-400/30",
    dot: "bg-red-500",
  },
};

const statusLabels: Record<VisitaStatus, string> = {
  pendiente: "Pendiente",
  compro: "Compró",
  no_compra: "No compró",
};

function formatWaterDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatExpectedContainers(quantity?: number | null) {
  const value = quantity ?? 0;
  return `${value} ${value === 1 ? "bidón esperado" : "bidones esperados"}`;
}

function formatReason(reason?: string | null) {
  if (!reason) return "";

  const labels: Record<string, string> = {
    no_atendido: "No atendido",
    reprogramado: "Reprogramado",
    no_compra: "No compró",
  };

  return labels[reason] ?? reason.replaceAll("_", " ");
}

interface VisitaCardProps {
  visita: Visita;
  onMarkAsNotPurchased: (visita: Visita) => void;
  onGenerateSale: (visita: Visita) => void;
  isWaterMode?: boolean;
}

export function VisitaCard({
  visita,
  onMarkAsNotPurchased,
  onGenerateSale,
  isWaterMode = false,
}: VisitaCardProps) {
  const config = statusConfig[visita.status];
  const waterStatusLabel =
    visita.waterStop?.status === "entregado"
      ? "Entregado"
      : visita.waterStop?.status === "no_atendido"
        ? "No atendió"
        : visita.waterStop?.status === "reprogramado"
          ? "Reprogramado"
          : undefined;
  const label = isWaterMode
    ? waterStatusLabel ?? (visita.status === "pendiente" ? "Pendiente" : statusLabels[visita.status])
    : statusLabels[visita.status];

  return (
    <div
      className={cn(
        "border-b border-border/70 py-3.5 transition-colors hover:bg-muted/20"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.98rem] font-semibold leading-5 text-foreground">
            {visita.customer?.name || "Cliente"}
          </p>
          {visita.customer?.dni && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              DNI: {visita.customer.dni}
            </p>
          )}
          {visita.groups && visita.groups.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
              {visita.groups.map((group) => (
                <span
                  key={group.id}
                  className="inline-flex max-w-full items-center text-xs font-medium leading-4 text-sky-600 dark:text-sky-300"
                >
                  {group.name}
                </span>
              ))}
            </div>
          )}
          {visita.motivoNoCompra && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Motivo: {formatReason(visita.motivoNoCompra)}
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-1.5 text-[11px] font-semibold leading-5",
            config.badgeText
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
          {label}
        </div>
      </div>

      {isWaterMode && visita.waterStop && (
        <div className="mt-2 border-l-2 border-sky-500 pl-3 text-xs text-muted-foreground">
          {formatExpectedContainers(visita.waterStop.expectedContainerQuantity)}
          {visita.waterStop.scheduledDate ? ` · ${formatWaterDate(visita.waterStop.scheduledDate)}` : ""}
        </div>
      )}

      {visita.status === "pendiente" && (
        <div className="mt-3 flex gap-2 border-t border-border/40 pt-2.5 dark:border-white/[0.07]">
          {!isWaterMode && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 flex-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
              onClick={() => onMarkAsNotPurchased(visita)}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              No compró
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 flex-1 rounded-lg text-xs font-medium text-orange-700 hover:bg-orange-50 dark:text-orange-200 dark:hover:bg-orange-400/10"
            onClick={() => onGenerateSale(visita)}
          >
            {isWaterMode ? (
              <Truck className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isWaterMode ? "Entregar" : "Generar venta"}
          </Button>
        </div>
      )}
    </div>
  );
}

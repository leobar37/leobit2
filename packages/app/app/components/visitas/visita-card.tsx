import { X, ShoppingCart } from "lucide-react";
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

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 transition-colors",
        "border-stone-200/60 bg-card/55 hover:bg-card/75",
        "dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:bg-white/[0.045]"
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visita.groups.map((group) => (
                <span
                  key={group.id}
                  className="inline-flex max-w-full items-center rounded-full border border-sky-200/60 bg-sky-50/75 px-2 py-0.5 text-[11px] font-medium leading-4 text-sky-700 dark:border-sky-400/10 dark:bg-sky-400/10 dark:text-sky-200"
                >
                  {group.name}
                </span>
              ))}
            </div>
          )}
          {visita.motivoNoCompra && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Motivo: {visita.motivoNoCompra}
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5",
            config.badgeBg,
            config.badgeText,
            config.badgeBorder
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
          {statusLabels[visita.status]}
        </div>
      </div>

      {visita.status === "pendiente" && (
        <div className="mt-3 flex gap-2 border-t border-border/40 pt-2.5 dark:border-white/[0.07]">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 flex-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
            onClick={() => onMarkAsNotPurchased(visita)}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            No compró
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 flex-1 rounded-lg text-xs font-medium text-orange-700 hover:bg-orange-50 dark:text-orange-200 dark:hover:bg-orange-400/10"
            onClick={() => onGenerateSale(visita)}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            Generar venta
          </Button>
        </div>
      )}
    </div>
  );
}

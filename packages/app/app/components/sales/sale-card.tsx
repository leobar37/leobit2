import {
  CalendarDays,
  ChevronRight,
  ShoppingCart,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "~/lib/utils";
import type { Sale } from "~/lib/db/schemas/sale";

interface SaleCardProps {
  sale: Sale;
  onClick?: () => void;
}

const syncStatusLabel: Record<Sale["syncStatus"], string> = {
  pending: "Pendiente",
  synced: "Sincronizado",
  error: "Error",
};

const saleStatusLabel: Record<Sale["status"], string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  active: "Activa",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

function formatSaleDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaleCard({ sale, onClick }: SaleCardProps) {
  const customerName = sale.customer?.name || "Cliente general";
  const isCredit = sale.saleType === "credito";
  const isDraft = sale.status === "draft";

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="h-auto w-full justify-start rounded-2xl p-0 text-left hover:bg-transparent"
    >
      <Card className="w-full border-0 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {customerName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Venta #{sale.id.slice(-6)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    S/ {formatCurrency(sale.totalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isCredit ? "Crédito" : "Contado"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "border-0",
                    isDraft
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  )}
                >
                  {saleStatusLabel[sale.status]}
                </Badge>

                <Badge
                  variant="outline"
                  className={cn(
                    "border-0",
                    sale.syncStatus === "error"
                      ? "bg-red-100 text-red-700"
                      : sale.syncStatus === "pending"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                  )}
                >
                  {syncStatusLabel[sale.syncStatus]}
                </Badge>

                {sale.balanceDue !== "0" && (
                  <Badge
                    variant="outline"
                    className="border-0 bg-orange-100 text-orange-700"
                  >
                    Debe S/ {formatCurrency(sale.balanceDue)}
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <div className="flex min-w-0 items-center gap-1.5">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{customerName}</span>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  <span>{formatSaleDate(sale.saleDate)}</span>
                </div>
              </div>
            </div>

            <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Button>
  );
}

import { ShoppingCart, WifiOff, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Sale } from "~/lib/services/sale-service";
import { formatCurrency } from "~/lib/utils";

interface SaleDetailSummaryCardProps {
  sale: Sale;
}

export function SaleDetailSummaryCard({ sale }: SaleDetailSummaryCardProps) {
  const paidAmount = Number(sale.amountPaid ?? 0);
  const dueAmount = Number(sale.balanceDue ?? 0);
  const totalAmount = Number(sale.totalAmount ?? 0);

  const saleWorkflowStatus =
    sale.status === "draft"
      ? "Borrador"
      : sale.status === "confirmed"
        ? "Confirmada"
        : sale.status === "active"
          ? "Activa"
          : sale.status === "delivered"
            ? "Entregada"
            : "Cancelada";

  const saleStatus =
    sale.saleType === "contado"
      ? "Pago total"
      : paidAmount <= 0
        ? "Debe todo"
        : dueAmount > 0
          ? "A cuenta"
          : "Sin deuda";

  const getWorkflowBadgeStyles = () => {
    switch (sale.status) {
      case "draft":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "confirmed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "delivered":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPaymentBadgeStyles = () => {
    if (sale.saleType === "contado") {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
    if (paidAmount <= 0) {
      return "bg-red-100 text-red-700 border-red-200";
    }
    if (dueAmount > 0) {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/68">
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-orange-700/80">
              {saleWorkflowStatus}
            </p>

            <div className="mt-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold tracking-tight text-foreground">
                  Venta #{sale.id.slice(-6)}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {sale.customer?.name || "Cliente general"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold tracking-[-0.04em] text-foreground">
                  S/ {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getWorkflowBadgeStyles()}`}
              >
                {saleWorkflowStatus}
              </Badge>

              <Badge
                variant="outline"
                className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getPaymentBadgeStyles()}`}
              >
                {saleStatus}
              </Badge>

              {sale.saleType === "credito" && (
                <Badge
                  variant="outline"
                  className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700"
                >
                  Crédito
                </Badge>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {sale.syncStatus === "synced" ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Sincronizado</span>
                </>
              ) : sale.syncStatus === "error" ? (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Error de sincronización</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-amber-500" />
                  <span className="text-xs text-amber-600 font-medium">Pendiente de sincronizar</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t shell-divider pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Abonado</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              S/ {formatCurrency(paidAmount)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              {sale.saleType === "credito" ? "Saldo pendiente" : "Estado"}
            </p>
            <p
              className={`mt-1 text-lg font-semibold ${
                sale.saleType === "credito" && dueAmount > 0
                  ? "text-red-600"
                  : "text-emerald-600"
              }`}
            >
              {sale.saleType === "credito"
                ? `S/ ${formatCurrency(dueAmount)}`
                : "Pagado"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

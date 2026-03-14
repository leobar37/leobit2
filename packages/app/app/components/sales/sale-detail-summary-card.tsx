import { ShoppingCart, WifiOff, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Sale } from "~/lib/services/sale-service";

interface SaleDetailSummaryCardProps {
  sale: Sale;
}

export function SaleDetailSummaryCard({ sale }: SaleDetailSummaryCardProps) {
  const paidAmount = Number(sale.amountPaid ?? 0);
  const dueAmount = Number(sale.balanceDue ?? 0);

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
    <Card className="shell-card-flat rounded-[28px]">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-100/90 ring-1 ring-orange-100">
            <ShoppingCart className="h-7 w-7 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Venta #{sale.id.slice(-6)}</p>
            
            {/* Main badges - now wrap properly */}
            <div className="mt-2 flex flex-wrap gap-1.5">
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
            
            {/* Sync status - separate row with icon */}
            <div className="mt-2 flex items-center gap-1.5">
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
      </CardContent>
    </Card>
  );
}

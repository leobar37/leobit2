import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Sale } from "~/hooks/use-sales";

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

  return (
    <Card className="shell-card-flat rounded-[28px]">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-100/90 ring-1 ring-orange-100">
            <ShoppingCart className="h-7 w-7 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Venta #{sale.id.slice(-6)}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700"
              >
                {saleWorkflowStatus}
              </Badge>
              <Badge
                variant={sale.saleType === "contado" ? "default" : "secondary"}
                className={
                  sale.saleType === "contado"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }
              >
                {saleStatus}
              </Badge>
              {sale.saleType === "credito" && (
                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                  Credito
                </Badge>
              )}
              <Badge variant={sale.syncStatus === "synced" ? "default" : "outline"}>
                {sale.syncStatus === "synced" ? "Sincronizado" : "Pendiente"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { ShoppingCart, Calendar, Banknote, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "~/lib/utils";
import type { Sale } from "~/lib/db/schema";
import {
  MinimalCard,
  MinimalCardContent,
  MinimalCardMedia,
} from "~/components/cards";

interface SaleCardProps {
  sale: Sale;
  onClick?: () => void;
}

export function SaleCard({ sale, onClick }: SaleCardProps) {
  const formattedDate = new Date(sale.saleDate).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedAmount = formatCurrency(Number(sale.totalAmount));
  const paidAmount = Number(sale.amountPaid);
  const dueAmount = Number(sale.balanceDue);
  const isCredit = sale.saleType === "credito";
  const isCancelled = sale.status === "cancelled";

  const saleStatus = !isCredit
    ? "Pago total"
    : paidAmount <= 0
      ? "Debe todo"
      : dueAmount > 0
        ? "A cuenta"
        : "Sin deuda";

  const customerName = sale.client?.name || (sale.clientId ? null : "Cliente general");
  const customerIdentifier = sale.clientId?.slice(-8) || "";

  return (
    <MinimalCard 
      variant="outlined" 
      interactive 
      clickable 
      radius="md"
      onClick={onClick}
      className={isCancelled ? "opacity-60" : undefined}
    >
      <MinimalCardContent className="p-4">
        <div className="flex items-start gap-3">
          <MinimalCardMedia 
            icon={ShoppingCart} 
            iconColor={isCancelled ? "text-red-400" : "text-orange-600"} 
            size="md" 
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  Venta #{sale.id.slice(-6)}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {isCancelled ? (
                    <Badge
                      variant="destructive"
                      className="text-xs bg-red-100 text-red-700 hover:bg-red-100"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancelada
                    </Badge>
                  ) : (
                    <Badge
                      variant={isCredit ? "secondary" : "default"}
                      className={`text-xs ${
                        isCredit
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                          : "bg-green-100 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {saleStatus}
                    </Badge>
                  )}
                  {isCredit && !isCancelled && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                    >
                      Crédito
                    </Badge>
                  )}
                </div>
              </div>

              {!isCancelled && isCredit && dueAmount > 0 && (
                <Badge variant="destructive" className="shrink-0 text-xs">
                  Pendiente S/ {formatCurrency(dueAmount)}
                </Badge>
              )}
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">
                  {customerName || `Cliente #${customerIdentifier}`}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Banknote className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                <span className="text-orange-600">S/ {formattedAmount}</span>
              </div>

              {isCredit && paidAmount > 0 && (
                <div className="text-xs text-muted-foreground">
                  Abono inicial: S/ {formatCurrency(paidAmount)}
                </div>
              )}
            </div>
          </div>
        </div>
      </MinimalCardContent>
    </MinimalCard>
  );
}

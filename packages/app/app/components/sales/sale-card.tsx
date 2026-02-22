import { ShoppingCart, User, Calendar, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Sale } from "~/lib/db/schema";

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

  const formattedAmount = Number(sale.totalAmount).toFixed(2);
  const paidAmount = Number(sale.amountPaid);
  const dueAmount = Number(sale.balanceDue);
  const isCredit = sale.saleType === "credito";

  const saleStatus = !isCredit
    ? "Pago total"
    : paidAmount <= 0
      ? "Debe todo"
      : dueAmount > 0
        ? "A cuenta"
        : "Sin deuda";

  // Get customer name from the client relation or fallback to ID or general customer
  const customerName = sale.client?.name || (sale.clientId ? null : "Cliente general");
  const customerIdentifier = sale.clientId?.slice(-8) || "";

  return (
    <Card
      className="border-0 shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="h-6 w-6 text-orange-600" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row with sale ID, badges and pending amount */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  Venta #{sale.id.slice(-6)}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
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
                  {isCredit && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                    >
                      Crédito
                    </Badge>
                  )}
                </div>
              </div>

              {isCredit && dueAmount > 0 && (
                <Badge variant="destructive" className="shrink-0 text-xs">
                  Pendiente S/ {dueAmount.toFixed(2)}
                </Badge>
              )}
            </div>

            {/* Details row */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
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
                  Abono inicial: S/ {paidAmount.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

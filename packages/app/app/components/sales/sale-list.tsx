import { ShoppingCart, Calendar, CreditCard, Banknote, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Sale } from "~/lib/db/schema";

interface SaleListProps {
  sales: Sale[];
  showCustomer?: boolean;
}

export function SaleList({ sales, showCustomer = false }: SaleListProps) {
  if (sales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">No hay ventas</div>
    );
  }

  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedSales.map((sale) => {
        const paidAmount = parseFloat(sale.amountPaid);
        const dueAmount = parseFloat(sale.balanceDue);
        const isCredit = sale.saleType === "credito";
        const statusLabel = !isCredit
          ? "Pago total"
          : paidAmount <= 0
            ? "Debe todo"
            : dueAmount > 0
              ? "A cuenta"
              : "Sin deuda";

        // Get customer name from the client relation
        const customerName = sale.client?.name;
        const customerIdentifier = sale.clientId?.slice(-8) || "";

        return (
        <Card key={sale.id} className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Header with amount and status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        S/ {parseFloat(sale.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge
                        variant={isCredit ? "secondary" : "default"}
                        className={`text-xs ${
                          isCredit
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                            : "bg-green-100 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {statusLabel}
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

                  {isCredit && dueAmount === 0 && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs shrink-0">
                      Sin deuda
                    </Badge>
                  )}
                </div>

                {/* Details row */}
                <div className="mt-2 space-y-1">
                  {showCustomer && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {customerName || (sale.clientId ? `Cliente #${customerIdentifier}` : "Cliente general")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>
                      {new Date(sale.saleDate).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {isCredit && paidAmount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Banknote className="h-3 w-3 shrink-0" />
                      <span>Abono inicial: S/ {paidAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}

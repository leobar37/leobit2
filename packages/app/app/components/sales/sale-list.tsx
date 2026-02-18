import { ShoppingCart, Calendar, CreditCard } from "lucide-react";
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

        return (
        <Card key={sale.id} className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      S/ {parseFloat(sale.totalAmount).toFixed(2)}
                    </p>
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
                        Credito
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(sale.saleDate).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {isCredit && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Abono inicial: S/ {paidAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                {isCredit && dueAmount > 0 && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <CreditCard className="h-3 w-3" />
                    <span>Pendiente: S/ {dueAmount.toFixed(2)}</span>
                  </div>
                )}

                {isCredit && dueAmount === 0 && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    Sin deuda
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}

import { ShoppingCart, User, Calendar, DollarSign } from "lucide-react";
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

  return (
    <Card
      className="border-0 shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  Venta #{sale.id.slice(-6)}
                </h3>
                <Badge
                  variant={isCredit ? "secondary" : "default"}
                  className={
                    isCredit
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                      : "bg-green-100 text-green-700 hover:bg-green-100"
                  }
                >
                  {saleStatus}
                </Badge>
                {isCredit && (
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700 border-orange-200"
                  >
                    Credito
                  </Badge>
                )}
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formattedDate}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{sale.clientId || "Cliente general"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <DollarSign className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-orange-600">S/ {formattedAmount}</span>
                </div>

                {isCredit && (
                  <div className="text-xs text-muted-foreground">
                    Abono inicial: S/ {paidAmount.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isCredit && dueAmount > 0 && (
            <Badge variant="destructive" className="shrink-0">
              Pendiente S/ {dueAmount.toFixed(2)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

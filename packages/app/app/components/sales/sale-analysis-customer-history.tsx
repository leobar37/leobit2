import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Calendar } from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { formatDate } from "~/lib/formatting";

interface CustomerHistory {
  totalPurchases: number;
  totalSpent: number;
  averageSaleAmount: number;
  lastPurchaseDate: Date | null;
}

interface SaleAnalysisCustomerHistoryProps {
  customerHistory: CustomerHistory | null;
}

export function SaleAnalysisCustomerHistory({
  customerHistory,
}: SaleAnalysisCustomerHistoryProps) {
  if (!customerHistory) {
    return (
      <Card className="shell-card-flat rounded-[28px]">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No hay datos del cliente disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Historial de Compras</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/40 rounded-[20px] p-4">
              <p className="text-xs text-muted-foreground">Total de compras</p>
              <p className="text-2xl font-bold">{customerHistory.totalPurchases}</p>
            </div>
            <div className="bg-muted/40 rounded-[20px] p-4">
              <p className="text-xs text-muted-foreground">Total gastado</p>
              <p className="text-2xl font-bold text-green-600">
                S/ {formatCurrency(customerHistory.totalSpent)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/40 rounded-[20px] p-4">
              <p className="text-xs text-muted-foreground">Promedio por compra</p>
              <p className="text-lg font-semibold">
                S/ {formatCurrency(customerHistory.averageSaleAmount)}
              </p>
            </div>
            <div className="bg-muted/40 rounded-[20px] p-4">
              <p className="text-xs text-muted-foreground">Última compra</p>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {customerHistory.lastPurchaseDate
                    ? formatDate(customerHistory.lastPurchaseDate)
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {customerHistory.totalPurchases > 1 && (
        <Card className="shell-card-flat rounded-[28px] border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-orange-900">Cliente recurrente</p>
                <p className="text-sm text-orange-700">
                  Este cliente ha realizado {customerHistory.totalPurchases} compras con un
                  valor total de S/ {formatCurrency(customerHistory.totalSpent)}. Es un
                  cliente valioso para tu negocio.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

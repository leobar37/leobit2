import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, DollarSign, Percent } from "lucide-react";
import { formatCurrency } from "~/lib/utils";

interface ProfitItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalMarginPercent: number;
}

interface ProfitAnalysis {
  items: ProfitItem[];
  summary: ProfitSummary;
}

interface SaleAnalysisProfitProps {
  profitAnalysis: ProfitAnalysis | null;
}

export function SaleAnalysisProfit({ profitAnalysis }: SaleAnalysisProfitProps) {
  if (!profitAnalysis) {
    return (
      <Card className="shell-card-flat rounded-[28px]">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No hay datos de rentabilidad disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  const { items, summary } = profitAnalysis;

  return (
    <div className="space-y-4">
      <Card className="shell-card-flat rounded-[28px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Rentabilidad Total
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-[20px]">
            <p className="text-sm text-muted-foreground mb-1">Ganancia Total</p>
            <p
              className={`text-3xl font-bold ${
                summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              S/ {formatCurrency(summary.totalProfit)}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {summary.totalMarginPercent}% margen
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="shell-block-muted rounded-[20px] p-3">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="text-lg font-semibold">
                S/ {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            <div className="shell-block-muted rounded-[20px] p-3">
              <p className="text-xs text-muted-foreground">Costos</p>
              <p className="text-lg font-semibold text-red-600">
                S/ {formatCurrency(summary.totalCost)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card className="shell-card-flat rounded-[28px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Por Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="shell-card-soft rounded-[20px] p-3 space-y-2"
              >
                <p className="font-medium truncate">{item.productName}</p>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Cantidad</p>
                    <p className="font-medium">{item.quantity.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Precio</p>
                    <p className="font-medium">S/ {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Costo</p>
                    <p className="font-medium">S/ {formatCurrency(item.costPrice)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Ganancia</p>
                    <p
                      className={`font-semibold ${
                        item.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      S/ {formatCurrency(item.profit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Margen</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.marginPercent >= 30
                          ? "bg-green-100 text-green-700"
                          : item.marginPercent >= 15
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.marginPercent}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

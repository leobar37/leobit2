import { TrendingUp, Package, Percent } from "lucide-react";
import { formatCurrency, formatNumber } from "~/lib/utils";
import { SaleDetailSection } from "./sale-detail-section";

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
      <SaleDetailSection
        title="Rentabilidad"
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <div className="p-4">
          <p className="text-center text-muted-foreground">
            No hay datos de rentabilidad disponibles
          </p>
        </div>
      </SaleDetailSection>
    );
  }

  const { items, summary } = profitAnalysis;

  return (
    <div className="space-y-4">
      <SaleDetailSection
        title="Rentabilidad"
        icon={<TrendingUp className="h-4 w-4" />}
        action={
          <span className="text-xs font-medium text-muted-foreground">
            {summary.totalMarginPercent}% margen
          </span>
        }
      >
        <div className="p-3">
          <div className="shell-card-soft rounded-xl px-3 py-3">
            <p className="text-xs text-muted-foreground">Ganancia total</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p
                className={`text-2xl font-bold tracking-[-0.04em] ${
                  summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                S/ {formatCurrency(summary.totalProfit)}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Percent className="h-4 w-4" />
                <span>{summary.totalMarginPercent}%</span>
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="shell-card-soft rounded-xl px-3 py-2">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="mt-1 font-semibold">
                S/ {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            <div className="shell-card-soft rounded-xl px-3 py-2">
              <p className="text-xs text-muted-foreground">Costos</p>
              <p className="mt-1 font-semibold text-red-600">
                S/ {formatCurrency(summary.totalCost)}
              </p>
            </div>
          </div>
        </div>
      </SaleDetailSection>

      {items.length > 0 && (
        <SaleDetailSection
          title="Por producto"
          icon={<Package className="h-4 w-4" />}
          action={
            <span className="text-xs font-medium text-muted-foreground">
              {items.length} producto{items.length > 1 ? "s" : ""}
            </span>
          }
        >
          <div className="space-y-2 p-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="shell-card-soft space-y-3 rounded-xl px-3 py-3"
              >
                <p className="font-medium truncate">{item.productName}</p>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Cantidad</p>
                    <p className="font-medium">{formatNumber(item.quantity)}</p>
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
          </div>
        </SaleDetailSection>
      )}
    </div>
  );
}

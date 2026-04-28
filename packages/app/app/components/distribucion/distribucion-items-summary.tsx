/**
 * Distribucion Items Summary
 * Read-only view for closed distributions
 * Shows: Producto | Llevó | Vendió | Devolvió
 */

import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKilos } from "~/lib/utils";
import type { DistribucionItemEnriched } from "~/hooks/use-distribuciones";

interface DistribucionItemsSummaryProps {
  items: DistribucionItemEnriched[];
}

export function DistribucionItemsSummary({ items }: DistribucionItemsSummaryProps) {
  if (items.length === 0) {
    return null;
  }

  // Calculate totals
  const totalLlevo = items.reduce(
    (sum, item) => sum + parseFloat(item.cantidadAsignada || "0"),
    0
  );
  const totalVendio = items.reduce(
    (sum, item) => sum + parseFloat(item.cantidadVendida || "0"),
    0
  );
  const totalDevolvio = totalLlevo - totalVendio;

  return (
    <Card className="border-0 bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-orange-500" />
          Resumen de Productos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground px-2">
            <span>Producto</span>
            <span className="text-right">Llevó</span>
            <span className="text-right">Vendió</span>
            <span className="text-right">Devolvió</span>
          </div>

          {/* Items */}
          {items.map((item) => {
            const llevó = parseFloat(item.cantidadAsignada || "0");
            const vendió = parseFloat(item.cantidadVendida || "0");
            const devolvió = llevó - vendió;

            return (
              <div
                key={item.id}
                className="grid grid-cols-4 gap-2 py-2 px-2 rounded-lg bg-white border border-border/50 items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.productName || "Producto"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.variantName}
                  </p>
                </div>
                <span className="text-sm text-right">
                  {formatKilos(llevó, 1)}
                </span>
                <span className="text-sm text-right">
                  {formatKilos(vendió, 1)}
                </span>
                <span className="text-sm text-right font-medium">
                  {formatKilos(devolvió, 1)}
                </span>
              </div>
            );
          })}

          {/* Totals */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50 px-2">
            <span className="text-sm font-medium">Total</span>
            <span className="text-sm font-medium text-right">
              {formatKilos(totalLlevo, 1)}
            </span>
            <span className="text-sm font-medium text-right">
              {formatKilos(totalVendio, 1)}
            </span>
            <span className="text-sm font-medium text-right">
              {formatKilos(totalDevolvio, 1)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

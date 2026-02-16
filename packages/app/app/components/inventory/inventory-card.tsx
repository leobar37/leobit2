import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package } from "lucide-react";
import { formatKilos, formatPercentage } from "~/lib/utils";

interface InventoryCardProps {
  kilosAsignados: number;
  kilosVendidos: number;
  puntoVenta: string;
  className?: string;
}

export function InventoryCard({
  kilosAsignados,
  kilosVendidos,
  puntoVenta,
  className,
}: InventoryCardProps) {
  const porcentajeVendido = Math.min(
    Math.round((kilosVendidos / (kilosAsignados || 1)) * 100),
    100
  );
  const kilosDisponibles = Math.max(kilosAsignados - kilosVendidos, 0);

  return (
    <Card
      className={`border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 ${className}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Mi Asignación
              </CardTitle>
              <p className="text-xs text-muted-foreground">Hoy</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-700 hover:bg-orange-100"
          >
            {puntoVenta}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <span className="text-4xl font-bold text-foreground">
            {formatKilos(kilosAsignados)}
          </span>
          <span className="text-lg text-muted-foreground ml-1">kg</span>
          <p className="text-sm text-muted-foreground mt-1">asignados</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Vendido: {formatKilos(kilosVendidos)} kg
            </span>
            <span className="font-medium text-orange-600">
              {porcentajeVendido}%
            </span>
          </div>
          <Progress value={porcentajeVendido} className="h-2 bg-orange-100" />
        </div>

        <div className="pt-2 border-t border-orange-500/10">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Disponible</span>
            <span className="text-lg font-semibold text-green-600">
              {formatKilos(kilosDisponibles)} kg
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package } from "lucide-react";
import { formatKilos } from "~/lib/utils";
import {
  MinimalCard,
  MinimalCardContent,
  MinimalCardTitle,
  MinimalCardMedia,
} from "~/components/cards";

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
  const asignados = Number(kilosAsignados) || 0;
  const vendidos = Number(kilosVendidos) || 0;

  const porcentajeVendido =
    asignados > 0 ? Math.min(Math.round((vendidos / asignados) * 100), 100) : 0;

  const kilosDisponibles = Math.max(asignados - vendidos, 0);

  return (
    <MinimalCard variant="filled" tone="primary" padding="lg" radius="lg" className={className}>
      <MinimalCardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MinimalCardMedia 
              icon={Package} 
              iconColor="text-orange-600" 
              size="md" 
              className="bg-orange-100"
            />
            <div>
              <MinimalCardTitle className="text-base">Mi Asignación</MinimalCardTitle>
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

        <div className="text-center py-2">
          <span className="text-4xl font-bold text-foreground">
            {formatKilos(asignados)}
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

        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Disponible</span>
            <span className="text-lg font-semibold text-green-600">
              {formatKilos(kilosDisponibles)} kg
            </span>
          </div>
        </div>
      </MinimalCardContent>
    </MinimalCard>
  );
}

import { Badge } from "@/components/ui/badge";
import { Package, ShoppingBag, MapPin, Clock } from "lucide-react";
import {
  MinimalCard,
  MinimalCardContent,
  MinimalCardTitle,
  MinimalCardMedia,
} from "~/components/cards";

interface InventoryCardProps {
  puntoVenta: string;
  modo: "estricto" | "acumulativo" | "libre";
  estado: "activo" | "cerrado" | "en_ruta";
  cantidadItems?: number;
  className?: string;
}

export function InventoryCard({
  puntoVenta,
  modo,
  estado,
  cantidadItems = 0,
  className,
}: InventoryCardProps) {
  const getModoLabel = (m: string) => {
    switch (m) {
      case "libre":
        return "Modo Libre";
      case "acumulativo":
        return "Modo Acumulativo";
      default:
        return "Modo Estricto";
    }
  };

  const getModoDescription = (m: string, items: number) => {
    if (m === "libre") {
      return "Sin productos pre-asignados";
    }
    if (items === 0) {
      return "Sin productos asignados";
    }
    return `${items} producto${items !== 1 ? "s" : ""} asignado${items !== 1 ? "s" : ""}`;
  };

  const getEstadoBadge = (e: string) => {
    switch (e) {
      case "cerrado":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
            Cerrado
          </Badge>
        );
      case "en_ruta":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            En ruta
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            Activo
          </Badge>
        );
    }
  };

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
              <MinimalCardTitle className="text-base">Mi Distribución</MinimalCardTitle>
              <p className="text-xs text-muted-foreground">Hoy</p>
            </div>
          </div>
          {getEstadoBadge(estado)}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{puntoVenta}</span>
        </div>

        <div className="py-3 px-4 bg-orange-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            {modo === "libre" ? (
              <Clock className="h-4 w-4 text-orange-600" />
            ) : (
              <ShoppingBag className="h-4 w-4 text-orange-600" />
            )}
            <span className="font-medium text-orange-700">
              {getModoLabel(modo)}
            </span>
          </div>
          <p className="text-sm text-orange-600/80">
            {getModoDescription(modo, cantidadItems)}
          </p>
        </div>
      </MinimalCardContent>
    </MinimalCard>
  );
}

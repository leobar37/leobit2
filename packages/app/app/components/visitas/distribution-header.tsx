import { Calendar } from "lucide-react";

interface Distribution {
  fecha: string;
  puntoVenta: string;
}

interface DistributionHeaderProps {
  distribucion: Distribution;
}

export function DistributionHeader({ distribucion }: DistributionHeaderProps) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-orange-500" />
        <div>
          <p className="font-medium text-orange-900">Distribución activa</p>
          <p className="text-sm text-orange-700">
            {distribucion.fecha} - {distribucion.puntoVenta}
          </p>
        </div>
      </div>
    </div>
  );
}

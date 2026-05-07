import { Calendar } from "lucide-react";

interface Distribution {
  fecha: string | Date;
  puntoVenta: string;
}

interface DistributionHeaderProps {
  distribucion: Distribution;
}

function formatFecha(fecha: string | Date): string {
  if (typeof fecha === "string") return fecha;
  const day = String(fecha.getUTCDate()).padStart(2, "0");
  const month = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const year = fecha.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function DistributionHeader({ distribucion }: DistributionHeaderProps) {
  return (
    <div className="rounded-2xl border border-orange-200/50 bg-orange-500/10 dark:bg-orange-500/10 dark:border-orange-500/20 p-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-orange-500" />
        <div>
          <p className="font-medium text-orange-900 dark:text-orange-100">Distribución activa</p>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            {formatFecha(distribucion.fecha)} - {distribucion.puntoVenta}
          </p>
        </div>
      </div>
    </div>
  );
}

import { Calendar } from "lucide-react";

interface Distribution {
  fecha: string | Date;
  puntoVenta: string;
}

interface DistributionHeaderProps {
  distribucion: Distribution;
}

function formatFecha(fecha: string | Date): string {
  const date = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (Number.isNaN(date.getTime())) return String(fecha);

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function DistributionHeader({ distribucion }: DistributionHeaderProps) {
  return (
    <div className="border-y border-border/70 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
          <Calendar className="h-4 w-4 text-orange-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Distribución activa</p>
          <p className="text-sm text-muted-foreground">
            {formatFecha(distribucion.fecha)} · {distribucion.puntoVenta}
          </p>
        </div>
      </div>
    </div>
  );
}

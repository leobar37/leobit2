import { Link } from "react-router";
import { Car, Bike, Truck, Clock, Banknote, Timer, Tag } from "lucide-react";
import { cn } from "~/lib/utils";
import type { CocheraSession, CocheraVehicleType } from "@avileo/shared";
import { Button } from "@/components/ui/button";

interface VehicleCardProps {
  session: CocheraSession;
  now: Date;
  estimatedAmount?: number | null;
}

const VEHICLE_ICONS: Record<CocheraVehicleType, React.ReactNode> = {
  auto: <Car className="h-5 w-5" />,
  moto: <Bike className="h-5 w-5" />,
  camioneta: <Truck className="h-5 w-5" />,
};

const VEHICLE_LABELS: Record<CocheraVehicleType, string> = {
  auto: "Auto",
  moto: "Moto",
  camioneta: "Camioneta",
};

function formatElapsedTime(minutes: number): string {
  if (minutes < 1) return "Menos de 1 min";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} h`;
  return `${hrs} h ${mins} min`;
}

function formatEntryTime(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function VehicleCard({ session, now, estimatedAmount }: VehicleCardProps) {
  const entry = new Date(session.entryAt);
  const elapsed = Math.max(
    0,
    Math.floor((now.getTime() - entry.getTime()) / 1000 / 60)
  );
  const isLongStay = elapsed >= 60;

  return (
    <div
      data-testid={`cochera-vehicle-card-${session.plate}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors",
        isLongStay ? "border-orange-400/70" : "border-border"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          session.vehicleType === "moto"
            ? "bg-blue-100 text-blue-600"
            : session.vehicleType === "camioneta"
              ? "bg-purple-100 text-purple-600"
              : "bg-orange-100 text-orange-600"
        )}
      >
        {VEHICLE_ICONS[session.vehicleType]}
      </div>

      <Link
        to={`/cochera/cobrar/${session.id}`}
        className="min-w-0 flex-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        aria-label={`Cobrar vehículo ${session.plate}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-semibold tracking-wide text-foreground">
            {session.plate}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {VEHICLE_LABELS[session.vehicleType]}
          </span>
          {isLongStay ? (
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
              +1h
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatElapsedTime(elapsed)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Ingresó {formatEntryTime(session.entryAt)}
          </span>
        </div>

        {typeof estimatedAmount === "number" ? (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Tag className="h-3 w-3" />
            Est. {formatMoney(estimatedAmount)}
          </div>
        ) : null}

        {session.notes ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {session.notes}
          </p>
        ) : null}
      </Link>

      <Button
        asChild
        size="sm"
        data-testid={`cochera-checkout-link-${session.plate}`}
        className="shrink-0 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
      >
        <Link to={`/cochera/cobrar/${session.id}`}>
          <Banknote className="h-4 w-4 mr-1" />
          Cobrar
        </Link>
      </Button>
    </div>
  );
}

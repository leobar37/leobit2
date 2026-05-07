import { useMemo } from "react";
import { Link } from "react-router";
import { Car, Bike, Truck, Clock, Banknote } from "lucide-react";
import { cn } from "~/lib/utils";
import type { CocheraSession, CocheraVehicleType } from "@avileo/shared";
import { Button } from "@/components/ui/button";

interface VehicleCardProps {
  session: CocheraSession;
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

export function VehicleCard({ session }: VehicleCardProps) {
  const elapsed = useMemo(() => {
    const entry = new Date(session.entryAt);
    const now = new Date();
    const diffMs = now.getTime() - entry.getTime();
    return Math.max(0, Math.floor(diffMs / 1000 / 60));
  }, [session.entryAt]);

  return (
    <div
      data-testid={`cochera-vehicle-card-${session.plate}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
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

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-semibold tracking-wide">
            {session.plate}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {VEHICLE_LABELS[session.vehicleType]}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatElapsedTime(elapsed)}</span>
        </div>

        {session.notes ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {session.notes}
          </p>
        ) : null}
      </div>

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

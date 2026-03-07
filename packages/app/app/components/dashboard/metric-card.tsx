import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor = "text-orange-600",
  className,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const showChange = change !== undefined && change !== 0;

  return (
    <div
      className={cn(
        "bg-white rounded-xl p-4 border border-gray-100 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
          {showChange && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {isPositive ? "+" : ""}
                {change.toFixed(1)}%
              </span>
              <span className="text-muted-foreground font-normal">
                vs ayer
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "p-2.5 rounded-lg bg-gray-50 shrink-0 ml-3",
            iconColor.replace("text-", "bg-").replace("600", "100")
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

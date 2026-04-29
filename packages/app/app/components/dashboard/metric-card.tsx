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
        "shell-card-flat rounded-[24px] p-4",
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
            "ml-3 shrink-0 rounded-[18px] p-2.5",
            iconColor === "text-green-600" && "bg-emerald-100 dark:bg-emerald-500/15",
            iconColor === "text-blue-600" && "bg-blue-100 dark:bg-blue-500/15",
            iconColor === "text-red-600" && "bg-red-100 dark:bg-red-500/15",
            iconColor === "text-orange-600" && "bg-orange-100 dark:bg-orange-500/15"
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

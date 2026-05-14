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
  featured?: boolean;
  dataTestId?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor = "text-orange-600",
  className,
  featured = false,
  dataTestId,
  onClick,
  ariaLabel,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const showChange = change !== undefined && change !== 0;
  const isInteractive = Boolean(onClick);
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium text-muted-foreground", featured ? "text-sm" : "text-sm")}>
            {title}
          </p>
          <p className={cn("mt-1 truncate font-semibold tracking-tight text-foreground", featured ? "text-[1.85rem]" : "text-[1.65rem]")}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {showChange && (
            <div
              className={cn(
                "mt-3 flex items-center gap-1 text-xs font-medium",
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
            "ml-3 shrink-0 rounded-md p-2",
            iconColor === "text-green-600" && "bg-emerald-100/80 dark:bg-emerald-500/12",
            iconColor === "text-blue-600" && "bg-blue-100/80 dark:bg-blue-500/12",
            iconColor === "text-red-600" && "bg-red-100/80 dark:bg-red-500/12",
            iconColor === "text-orange-600" && "bg-orange-100/80 dark:bg-orange-500/12"
          )}
        >
          <Icon className={cn("h-[18px] w-[18px]", iconColor)} />
        </div>
      </div>
    </>
  );

  const classes = cn(
    "rounded-lg border border-border/70 bg-muted/15 p-3.5",
    featured && "bg-muted/25",
    isInteractive && "w-full text-left transition-colors active:scale-[0.98] hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        data-testid={dataTestId}
        aria-label={ariaLabel ?? title}
        onClick={onClick}
        className={classes}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      data-testid={dataTestId}
      className={classes}
    >
      {content}
    </div>
  );
}

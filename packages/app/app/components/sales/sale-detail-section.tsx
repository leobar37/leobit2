import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface SaleDetailSectionProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SaleDetailSection({
  title,
  children,
  icon,
  action,
  className,
  contentClassName,
}: SaleDetailSectionProps) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <div className="flex-shrink-0 text-orange-600">{icon}</div>
          ) : null}
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>

        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-2xl bg-muted/40",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}

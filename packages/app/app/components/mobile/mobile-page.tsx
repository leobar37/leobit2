import { type HTMLAttributes, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "~/lib/utils";

interface MobilePageRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "",
};

function MobilePageRoot({
  children,
  maxWidth = "full",
  className,
  ...props
}: MobilePageRootProps) {
  return (
    <div
      data-mobile-page=""
      className={cn("mx-auto", maxWidthClasses[maxWidth], className)}
      {...props}
    >
      {children}
    </div>
  );
}

MobilePageRoot.displayName = "MobilePage.Root";

interface MobilePageCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "flat" | "soft" | "muted";
}

function MobilePageCard({
  children,
  variant = "flat",
  className,
  ...props
}: MobilePageCardProps) {
  const variantClass =
    variant === "soft"
      ? "shell-card-soft"
      : variant === "muted"
        ? "shell-card-muted"
        : "shell-card-flat";

  return (
    <div
      data-mobile-page-card=""
      className={cn("rounded-2xl", variantClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}

MobilePageCard.displayName = "MobilePage.Card";

interface MobilePageHeaderProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  backLabel?: string;
  meta?: ReactNode;
  onBack?: () => void;
  subtitle?: ReactNode;
}

function MobilePageHeader({
  title,
  actions,
  badge,
  backLabel = "Volver",
  className,
  meta,
  onBack,
  subtitle,
  ...props
}: MobilePageHeaderProps) {
  return (
    <header
      data-mobile-page-header=""
      className={cn("relative z-10", className)}
      {...props}
    >
      <div className="flex min-h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 shrink-0 rounded-2xl bg-white/[0.055] p-2 text-muted-foreground transition-colors hover:bg-white/[0.09] hover:text-foreground"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {(meta || actions) ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {meta}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

MobilePageHeader.displayName = "MobilePage.Header";

export const MobilePage = {
  Root: MobilePageRoot,
  Card: MobilePageCard,
  Header: MobilePageHeader,
};

export type {
  MobilePageRootProps,
  MobilePageCardProps,
  MobilePageHeaderProps,
};

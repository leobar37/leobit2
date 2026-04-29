import { type HTMLAttributes, type ReactNode } from "react";
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

export const MobilePage = {
  Root: MobilePageRoot,
  Card: MobilePageCard,
};

export type { MobilePageRootProps, MobilePageCardProps };

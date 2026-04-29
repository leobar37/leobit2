import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "~/lib/utils";

interface MobileFixedFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  aboveNav?: boolean;
}

function MobileFixedFooter({
  children,
  aboveNav = false,
  className,
  ...props
}: MobileFixedFooterProps) {
  return (
    <div
      data-testid="mobile-fixed-footer"
      data-mobile-fixed-footer=""
      className={cn(
        "fixed inset-x-0 z-40",
        aboveNav
          ? "bottom-[calc(var(--shell-bottom-nav-height)+var(--shell-safe-area-bottom,env(safe-area-inset-bottom)))]"
          : "bottom-[var(--shell-safe-area-bottom,env(safe-area-inset-bottom))]"
      )}
      style={
        {
          paddingBottom: "max(var(--shell-safe-area-bottom, env(safe-area-inset-bottom)), env(keyboard-inset-height, 0px))",
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        className={cn(
          "px-3 pt-4 pb-3 sm:px-4 sm:pt-5",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

MobileFixedFooter.displayName = "MobileFixedFooter";

export { MobileFixedFooter };
export type { MobileFixedFooterProps };

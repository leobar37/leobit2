import type { ReactNode } from "react";
import { MobileSlot } from "~/components/mobile";
import { cn } from "~/lib/utils";

interface ToolbarActionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * @deprecated Prefer route-level footer composition with `MobileSlot name="footer"`
 * (higher priority) or `MobileFixedFooter` for standalone action bars.
 *
 * This component remains as a compatibility shim for routes that still
 * render the legacy footer wrapper.
 */
export function ToolbarActions({ children, className }: ToolbarActionsProps) {
  return (
    <MobileSlot name="footer" priority={-10}>
      <div className={cn("pointer-events-auto px-3 pb-3 sm:px-4", className)}>
      <div className="mx-auto max-w-lg">
        <div className="shell-surface rounded-[22px] border shell-divider p-2 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          {children}
        </div>
      </div>
      </div>
    </MobileSlot>
  );
}

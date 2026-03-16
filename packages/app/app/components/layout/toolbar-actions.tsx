import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "~/lib/utils";
import { useLayout } from "~/components/layout/app-layout";

interface ToolbarActionsProps {
  children: ReactNode;
  className?: string;
}

export function ToolbarActions({ children, className }: ToolbarActionsProps) {
  const { toolbarPortalHost } = useLayout();

  if (!toolbarPortalHost) {
    return null;
  }

  return createPortal(
    <div className={cn(
      "pointer-events-auto px-3 pb-3 sm:px-4",
      className
    )}>
      <div className="mx-auto max-w-lg">
        <div className="shell-surface rounded-[22px] border shell-divider p-2 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          {children}
        </div>
      </div>
    </div>,
    toolbarPortalHost
  );
}

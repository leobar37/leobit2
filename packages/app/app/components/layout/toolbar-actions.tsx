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
    <div className={cn("pointer-events-auto w-full bg-white border-t border-orange-100", className)}>
      {children}
    </div>,
    toolbarPortalHost
  );
}

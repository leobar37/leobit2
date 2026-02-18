"use client";

import { cn } from "~/lib/utils";

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cn("border-b border-border py-4 pt-6 px-6", className)}>
      {children}
    </div>
  );
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn("py-6 px-6 flex-1 overflow-y-auto", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "border-t border-border py-4 px-6 flex items-center gap-2 justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}
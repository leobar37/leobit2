"use client";

import { createPortal } from "react-dom";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "~/lib/utils";

interface ModalLayoutContextValue {
  headerPortal: HTMLDivElement | null;
  footerPortal: HTMLDivElement | null;
}

const ModalLayoutContext = createContext<ModalLayoutContextValue | null>(null);

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

export function ModalLayoutProvider({ children }: { children: React.ReactNode }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ModalLayoutContext.Provider
      value={{
        headerPortal: mounted ? headerRef.current : null,
        footerPortal: mounted ? footerRef.current : null,
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div ref={headerRef} className="shrink-0" />
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        <div ref={footerRef} className="shrink-0" />
      </div>
    </ModalLayoutContext.Provider>
  );
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  const context = useContext(ModalLayoutContext);
  const content = (
    <div className={cn("border-b border-border px-6 py-4 pt-6", className)}>
      {children}
    </div>
  );

  if (!context?.headerPortal) {
    return content;
  }

  return createPortal(content, context.headerPortal);
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn("px-6 py-6", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  const context = useContext(ModalLayoutContext);
  const content = (
    <div
      className={cn(
        "border-t border-border px-6 py-4 flex items-center justify-end gap-2",
        className
      )}
    >
      {children}
    </div>
  );

  if (!context?.footerPortal) {
    return content;
  }

  return createPortal(content, context.footerPortal);
}

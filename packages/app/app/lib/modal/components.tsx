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

/**
 * Modal slots are local to the modal overlay.
 *
 * Unlike MobileShell slots, these primitives do not register with the route shell
 * or any global host. They only portal into header/footer containers created by
 * the current modal instance, so modal content never leaks into page shell slots.
 */

interface ModalLayoutContextValue {
  headerPortal: HTMLDivElement | null;
  footerPortal: HTMLDivElement | null;
}

const ModalLayoutContext = createContext<ModalLayoutContextValue | null>(null);

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

function renderInModalPortal(
  content: React.ReactNode,
  target: HTMLDivElement | null,
) {
  if (!target) {
    return content;
  }

  return createPortal(content, target);
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

  return renderInModalPortal(content, context?.headerPortal ?? null);
}

ModalHeader.displayName = "Modal.Header";

export function ModalContent({ children, className }: ModalContentProps) {
  return <div className={cn("px-6 py-6", className)}>{children}</div>;
}

ModalContent.displayName = "Modal.Content";

/**
 * Backward-compatible alias for existing modal consumers.
 * Prefer ModalContent for the slot vocabulary that matches Header / Content / Footer.
 */
export function ModalBody(props: ModalContentProps) {
  return <ModalContent {...props} />;
}

ModalBody.displayName = "Modal.Body";

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

  return renderInModalPortal(content, context?.footerPortal ?? null);
}

ModalFooter.displayName = "Modal.Footer";

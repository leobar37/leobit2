import {
  createContext,
  useContext,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "~/lib/utils";
import { MobileSlot, MobileSlotHost } from "./mobile-slots";

interface MobileShellFloatingActionProps {
  children: ReactNode;
}

function MobileShellFloatingAction({ children }: MobileShellFloatingActionProps) {
  return (
    <MobileSlot name="floating">
      {children}
    </MobileSlot>
  );
}

MobileShellFloatingAction.displayName = "MobileShell.FloatingAction";

type MobileShellVariant = "public" | "protected" | "fullscreen";

interface MobileShellContextValue {
  variant: MobileShellVariant;
  hasBottomNav: boolean;
}

const MobileShellContext = createContext<MobileShellContextValue | null>(null);

function useMobileShell() {
  const context = useContext(MobileShellContext);
  if (!context) {
    throw new Error("MobileShell subcomponents must be used within MobileShell.Root");
  }
  return context;
}

interface MobileShellRootProps extends HTMLAttributes<HTMLDivElement> {
  variant?: MobileShellVariant;
  children: ReactNode;
}

function MobileShellRoot({
  variant = "protected",
  children,
  className,
  ...props
}: MobileShellRootProps) {
  const hasBottomNav = variant === "protected";
  const isFullscreen = variant === "fullscreen";

  const contextValue = useMemo<MobileShellContextValue>(
    () => ({ variant, hasBottomNav }),
    [variant, hasBottomNav]
  );

  return (
    <MobileShellContext.Provider value={contextValue}>
      <div
        data-testid="mobile-shell-root"
        data-mobile-shell=""
        data-variant={variant}
        className={cn(
          "relative flex flex-col",
          isFullscreen || hasBottomNav
            ? "h-screen h-dvh overflow-hidden"
            : "min-h-screen min-h-dvh",
          !isFullscreen && !hasBottomNav && "app-shell",
          className
        )}
        style={
          {
            "--shell-bottom-nav-height": hasBottomNav ? "77px" : "0px",
            "--shell-safe-area-bottom": "env(safe-area-inset-bottom)",
            "--shell-keyboard-inset": "env(keyboard-inset-height, 0px)",
            "--shell-public-footer-offset": variant === "public" ? "12rem" : "0px",
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
        <div
          data-testid="mobile-floating-actions"
          data-mobile-shell-floating=""
          className="fixed right-4 z-50 flex flex-col gap-3"
          style={{
            bottom: hasBottomNav
              ? "calc(var(--shell-bottom-nav-height) + var(--shell-safe-area-bottom) + 1rem)"
              : "calc(var(--shell-safe-area-bottom) + 1rem)",
          }}
        >
          <MobileSlotHost name="floating" />
        </div>
      </div>
    </MobileShellContext.Provider>
  );
}

MobileShellRoot.displayName = "MobileShell.Root";

interface MobileShellHeaderProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  showBackButton?: boolean;
  backHref?: string;
}

function MobileShellHeader({
  children,
  className,
  ...props
}: MobileShellHeaderProps) {
  return (
    <header
      data-testid="mobile-shell-header"
      data-mobile-shell-header=""
      className={cn(
        "sticky top-0 z-50 shrink-0 border-b shell-surface",
        className
      )}
      {...props}
    >
      <div className="flex items-center h-16 px-3 sm:px-4">
        {children ?? (
          <>
            <div className="flex min-w-0 items-center gap-3 flex-1">
              <MobileSlotHost
                name="header:left"
                className="flex items-center gap-2"
              />
              <MobileSlotHost
                name="header:center"
                className="flex min-w-0 items-center flex-1"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <MobileSlotHost
                name="header:right"
                className="flex items-center gap-2"
              />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

MobileShellHeader.displayName = "MobileShell.Header";

interface MobileShellContentProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

function MobileShellContent({
  children,
  className,
  ...props
}: MobileShellContentProps) {
  const { hasBottomNav, variant } = useMobileShell();

  return (
    <main
      data-testid="mobile-shell-content"
      data-mobile-shell-content=""
      className={cn(
        "flex-1 min-h-0 overflow-y-auto overscroll-y-contain",
        "px-3 py-5 sm:px-4",
        hasBottomNav ? "shell-content-with-nav" : "shell-content-no-nav",
        className
      )}
      style={
        {
          paddingBottom: hasBottomNav
            ? "calc(var(--shell-bottom-nav-height) + var(--shell-safe-area-bottom) + 1.25rem)"
            : "calc(var(--shell-safe-area-bottom) + var(--shell-public-footer-offset, 1rem))",
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
      {!hasBottomNav && variant === "public" ? (
        <div
          aria-hidden="true"
          className="shrink-0"
          style={{
            height: "var(--shell-public-footer-offset, 0px)",
          }}
        />
      ) : null}
    </main>
  );
}

MobileShellContent.displayName = "MobileShell.Content";

interface MobileShellFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function MobileShellFooter({
  children,
  className,
  ...props
}: MobileShellFooterProps) {
  const { hasBottomNav } = useMobileShell();

  return (
    <div
      data-testid="mobile-shell-footer"
      data-mobile-shell-footer=""
      className={cn(
        "fixed inset-x-0 z-40 pointer-events-none",
        hasBottomNav
          ? "bottom-[calc(var(--shell-bottom-nav-height)+var(--shell-safe-area-bottom))]"
          : "bottom-[calc(var(--shell-safe-area-bottom))]",
        className
      )}
      {...props}
    >
      <MobileSlotHost
        name="footer"
        className="pointer-events-auto px-3 pb-3 sm:px-4"
      />
      {children}
    </div>
  );
}

MobileShellFooter.displayName = "MobileShell.Footer";

interface MobileShellBackButtonProps {
  children: ReactNode;
}

function MobileShellBackButton({ children }: MobileShellBackButtonProps) {
  return (
    <MobileSlot name="header:left" priority={10}>
      {children}
    </MobileSlot>
  );
}

MobileShellBackButton.displayName = "MobileShell.BackButton";

export const MobileShell = {
  Root: MobileShellRoot,
  Header: MobileShellHeader,
  Content: MobileShellContent,
  Footer: MobileShellFooter,
  BackButton: MobileShellBackButton,
  FloatingAction: MobileShellFloatingAction,
};

export type { MobileShellVariant, MobileShellRootProps, MobileShellHeaderProps, MobileShellContentProps, MobileShellFooterProps };

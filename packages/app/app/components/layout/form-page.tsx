import { Link } from "react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "~/components/mobile/mobile-shell";
import { MobileSlot } from "~/components/mobile/mobile-slots";
import { MobilePage } from "~/components/mobile/mobile-page";
import { MobileFixedFooter } from "~/components/mobile/mobile-fixed-footer";
import type { CSSProperties, ReactNode } from "react";

interface FormPageProps {
  title: string;
  backHref: string;
  icon?: LucideIcon;
  children: ReactNode;
  toolbar?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

/**
 * @deprecated Use direct mobile shell composition with `MobileShell`, `MobileSlot`,
 * and `MobilePage` in route JSX instead.
 *
 * This wrapper is preserved only as a compatibility shim for legacy form routes
 * that still rely on it. It no longer renders a standalone shell; all layout
 * is delegated to the shared mobile shell stack.
 */
export function FormPage({
  title,
  backHref,
  icon: Icon,
  children,
  toolbar,
  maxWidth = "md",
}: FormPageProps) {
  const contentStyle = toolbar
    ? ({
        paddingBottom:
          "calc(var(--shell-bottom-nav-height, 0px) + var(--shell-safe-area-bottom, env(safe-area-inset-bottom)) + 5.5rem)",
      } satisfies CSSProperties)
    : undefined;

  return (
    <>
      <MobileShell.BackButton>
        <Link
          to={backHref}
          className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </MobileShell.BackButton>

      <MobileSlot name="header:center" priority={10}>
        <div className="flex min-w-0 items-center gap-2 flex-1">
          {Icon && <Icon className="h-5 w-5 text-orange-600 shrink-0" />}
          <h1 className="font-bold text-lg truncate">{title}</h1>
        </div>
      </MobileSlot>

      <MobilePage.Root maxWidth={maxWidth}>
        <div style={contentStyle}>{children}</div>
      </MobilePage.Root>

      {toolbar && (
        <MobileFixedFooter aboveNav>
          <MobilePage.Root maxWidth={maxWidth}>
            {toolbar}
          </MobilePage.Root>
        </MobileFixedFooter>
      )}
    </>
  );
}

interface FormToolbarProps {
  children: ReactNode;
  className?: string;
}

/**
 * @deprecated Prefer declaring the form action row with route-level
 * `MobileSlot name="footer"` content and `MobileFixedFooter`.
 */
export function FormToolbar({ children, className }: FormToolbarProps) {
  return <div className={className}>{children}</div>;
}

interface SubmitButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  isValid?: boolean;
  children: ReactNode;
  icon?: ReactNode;
}

/**
 * @deprecated Prefer explicit `Button` actions using `form`/`type="submit"`
 * and the parent layout's shell primitives (`MobileFixedFooter`, `MobilePage`).
 */
export function FormSubmitButton({
  onClick,
  isLoading,
  isValid = true,
  children,
  icon,
}: SubmitButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading || !isValid}
      className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
    >
      {isLoading ? (
        "Guardando..."
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Button>
  );
}

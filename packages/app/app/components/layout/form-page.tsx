import { Link } from "react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolbarActions } from "./toolbar-actions";
import { useSetLayout } from "./app-layout";
import { cn } from "~/lib/utils";
import type { ReactNode } from "react";

interface FormPageProps {
  title: string;
  backHref: string;
  icon?: LucideIcon;
  children: ReactNode;
  toolbar?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  useLayout?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "",
};

export function FormPage({
  title,
  backHref,
  icon: Icon,
  children,
  toolbar,
  maxWidth = "md",
  useLayout = false,
}: FormPageProps) {
  if (useLayout) {
    useSetLayout({
      title,
      showBackButton: true,
      backHref,
    });

    return (
      <div className={cn("h-full overflow-y-auto mx-auto", maxWidthClasses[maxWidth])}>
        <div className={toolbar ? "pb-20" : ""}>
          {children}
        </div>
        {toolbar && <ToolbarActions>{toolbar}</ToolbarActions>}
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell">
      <header className="sticky top-0 z-50 border-b shell-surface">
        <div className="flex items-center gap-3 h-16 px-3 sm:px-4">
          <Link
            to={backHref}
            className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {Icon && <Icon className="h-5 w-5 text-orange-600" />}
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
      </header>

      <main
        className={`px-3 py-4 sm:px-4 ${toolbar ? "pb-32" : "pb-24"} ${
          maxWidthClasses[maxWidth]
        } mx-auto`}
      >
        {children}
      </main>

      {toolbar && <ToolbarActions>{toolbar}</ToolbarActions>}
    </div>
  );
}

interface FormToolbarProps {
  children: ReactNode;
  className?: string;
}

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

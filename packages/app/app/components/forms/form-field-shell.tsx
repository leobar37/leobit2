import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldShellProps {
  children: ReactNode;
  description?: string;
  error?: string;
  helperText?: string;
  label?: ReactNode;
  labelClassName?: string;
  messageClassName?: string;
  reserveMessageSpace?: boolean;
}

export function FormFieldShell({
  children,
  description,
  error,
  helperText,
  label,
  labelClassName,
  messageClassName,
  reserveMessageSpace = true,
}: FormFieldShellProps) {
  const message = error || helperText || description || "";
  const hasMessage = message.length > 0;

  return (
    <div className="space-y-2">
      {label ? (
        typeof label === "string" ? (
          <Label className={labelClassName}>{label}</Label>
        ) : (
          label
        )
      ) : null}
      {children}
      <p
        aria-hidden={!hasMessage}
        className={cn(
          "text-xs leading-5",
          error ? "text-destructive" : "text-muted-foreground",
          reserveMessageSpace && "min-h-5",
          !hasMessage && "opacity-0",
          messageClassName,
        )}
      >
        {message}
      </p>
    </div>
  );
}

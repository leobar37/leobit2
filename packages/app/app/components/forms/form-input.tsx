import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Input
          ref={ref}
          className={cn(
            "h-12 rounded-xl border-input bg-background px-4",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

export { FormInput };

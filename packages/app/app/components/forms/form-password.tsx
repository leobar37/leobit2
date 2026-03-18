import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormFieldShell } from "./form-field-shell";

export interface FormPasswordProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  description?: string;
  helperText?: string;
  reserveMessageSpace?: boolean;
}

const FormPassword = forwardRef<HTMLInputElement, FormPasswordProps>(
  (
    {
      className,
      description,
      error,
      helperText,
      label,
      reserveMessageSpace = true,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <FormFieldShell
        description={description}
        error={error}
        helperText={helperText}
        label={label}
        reserveMessageSpace={reserveMessageSpace}
      >
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            data-testid={props.name ? `input-${props.name}` : "input-password"}
            className={cn(
              "shell-field h-12 rounded-[20px] px-4 pr-12",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />
          <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-white/70 hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </FormFieldShell>
    );
  }
);
FormPassword.displayName = "FormPassword";

export { FormPassword };

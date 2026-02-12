import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface FormPasswordProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

const FormPassword = forwardRef<HTMLInputElement, FormPasswordProps>(
  ({ className, label, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn(
              "h-12 rounded-xl border-input bg-background px-4 pr-12",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-12 w-12 rounded-l-none"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
FormPassword.displayName = "FormPassword";

export { FormPassword };

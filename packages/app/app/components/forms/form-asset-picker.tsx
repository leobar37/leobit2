import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { AssetPicker } from "@/components/assets/asset-picker";

export interface FormAssetPickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}

const FormAssetPicker = forwardRef<HTMLDivElement, FormAssetPickerProps>(
  ({ className, label, error, helperText, placeholder, value, onChange, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && <Label>{label}</Label>}
        <AssetPicker
          value={value}
          onChange={onChange}
          placeholder={placeholder}
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
FormAssetPicker.displayName = "FormAssetPicker";

export { FormAssetPicker };

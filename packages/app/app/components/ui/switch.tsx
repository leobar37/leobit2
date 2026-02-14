import * as React from "react"

import { cn } from "~/lib/utils"

export interface SwitchProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  className?: string
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, checked, onCheckedChange, disabled, id, ...props }, ref) => {
    const switchId = id || React.useId()
    
    return (
      <div className={cn("flex items-start gap-3", className)}>
        <div className="relative flex items-center pt-0.5">
          <input
            type="checkbox"
            id={switchId}
            className="peer sr-only"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            disabled={disabled}
            ref={ref}
            {...props}
          />
          <label
            htmlFor={switchId}
            className={cn(
              "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
              "bg-gray-200 peer-checked:bg-orange-500",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                checked ? "translate-x-6" : "translate-x-1"
              )}
            />
          </label>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={switchId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }

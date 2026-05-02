import { forwardRef, useState } from "react";
import { useFormContext, Controller, type Control } from "react-hook-form";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppDrawer } from "@/components/ui/app-drawer";
import { FieldInfo } from "@/components/ui/field-info";
import { FormFieldShell } from "./form-field-shell";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface FormSelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  options: FormSelectOption[];
  error?: string;
  helperText?: string;
  reserveMessageSpace?: boolean;
  className?: string;
  triggerClassName?: string;
  "data-testid"?: string;
  /**
   * Optional control from react-hook-form.
   * If not provided, FormSelect must be used within a FormProvider.
   */
  control?: Control;
}

const FormSelect = forwardRef<HTMLDivElement, FormSelectProps>(
  (
    {
      className,
      triggerClassName,
      description,
      error,
      helperText,
      label,
      name,
      options,
      placeholder = "Seleccionar...",
      reserveMessageSpace = true,
      "data-testid": dataTestId,
      control: controlProp,
    },
    ref
  ) => {
    const formContext = useFormContext();

    // Guard clause: throw descriptive error if neither control prop nor context is available
    if (!controlProp && !formContext) {
      throw new Error(
        "FormSelect must be used within a FormProvider or receive a control prop. " +
        "Either wrap your form with <FormProvider {...form}> or pass control={form.control} to FormSelect."
      );
    }

    const control = controlProp || formContext?.control;
    const errors = formContext?.formState?.errors || {};
    const [open, setOpen] = useState(false);

    const fieldError = errors[name]?.message as string | undefined;
    const displayError = error ?? fieldError;

    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const selectedOption = options.find((opt) => opt.value === field.value);

          return (
            <div ref={ref} className={cn("space-y-2", className)}>
              {label && description ? (
                <FieldInfo label={label} description={description}>
                  <FormSelectTrigger
                    data-testid={dataTestId}
                    triggerClassName={triggerClassName}
                    placeholder={placeholder}
                    selectedLabel={selectedOption?.label}
                    onPress={() => setOpen(true)}
                    error={displayError}
                  />
                </FieldInfo>
              ) : (
                <FormSelectTrigger
                  data-testid={dataTestId}
                  triggerClassName={triggerClassName}
                  placeholder={placeholder}
                  selectedLabel={selectedOption?.label}
                  onPress={() => setOpen(true)}
                  error={displayError}
                  label={label}
                />
              )}

              <AppDrawer open={open} onOpenChange={setOpen}>
                <AppDrawer.Header title={label ?? "Seleccionar"} />
                <AppDrawer.Body scrollable>
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-1 pb-4">
                      {options.map((option) => {
                        const isSelected = option.value === field.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              field.onChange(option.value);
                              setOpen(false);
                            }}
                            className={cn(
                              "flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors",
                              "hover:bg-accent focus-visible:outline-none focus-visible:bg-accent",
                              isSelected
                                ? "bg-orange-50 text-orange-600 font-medium dark:bg-orange-500/12 dark:text-orange-300"
                                : "text-foreground"
                            )}
                          >
                            <span>{option.label}</span>
                            {isSelected && (
                              <Check className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </AppDrawer.Body>
              </AppDrawer>
            </div>
          );
        }}
      />
    );
  }
);
FormSelect.displayName = "FormSelect";

interface FormSelectTriggerProps {
  label?: string;
  placeholder?: string;
  selectedLabel?: string;
  onPress: () => void;
  error?: string;
  triggerClassName?: string;
  "data-testid"?: string;
}

function FormSelectTrigger({
  label,
  placeholder,
  selectedLabel,
  onPress,
  error,
  triggerClassName,
  "data-testid": dataTestId,
}: FormSelectTriggerProps) {
  return (
    <FormFieldShell
      label={label}
      error={error}
      reserveMessageSpace={false}
    >
      <button
        type="button"
        data-testid={dataTestId}
        onClick={onPress}
        className={cn(
          "shell-field h-12 w-full rounded-[20px] px-4 flex items-center justify-between text-left",
          "bg-background border border-input",
          "hover:bg-accent/50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          error && "border-destructive focus-visible:ring-destructive",
          triggerClassName
        )}
      >
        <span className={cn(selectedLabel ? "text-foreground" : "text-muted-foreground")}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className="h-4 w-4 text-muted-foreground flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          />
        </svg>
      </button>
    </FormFieldShell>
  );
}

export { FormSelect };

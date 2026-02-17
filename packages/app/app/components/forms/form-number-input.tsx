import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FormInput, type FormInputProps } from "./form-input";

export interface FormNumberInputProps extends FormInputProps {
	/** Maximum amount to display as helper text */
	maxAmount?: number;
	/** Step value for number input (default: 0.01) */
	step?: string;
}

/**
 * Specialized form input for number/currency fields.
 * Adds max amount helper text and defaults to step="0.01".
 */
const FormNumberInput = forwardRef<
	HTMLInputElement,
	FormNumberInputProps
>(({ className, maxAmount, step = "0.01", ...props }, ref) => {
	return (
		<div className="space-y-2">
			<FormInput
				ref={ref}
				type="number"
				step={step}
				className={cn("rounded-xl text-lg", className)}
				{...props}
			/>
			{maxAmount !== undefined && (
				<p className="text-xs text-muted-foreground">
					Máximo: S/ {maxAmount.toFixed(2)}
				</p>
			)}
		</div>
	);
});
FormNumberInput.displayName = "FormNumberInput";

export { FormNumberInput };

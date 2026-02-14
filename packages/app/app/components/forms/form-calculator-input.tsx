import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormInput, type FormInputProps } from "./form-input";

export interface FormCalculatorInputProps extends FormInputProps {
	/** Icon to display in the label */
	icon?: LucideIcon;
	/** Whether this field is currently active (shows orange ring) */
	isActive?: boolean;
}

/**
 * Specialized form input for calculator fields.
 * Adds icon support in label and active field highlighting.
 */
const FormCalculatorInput = forwardRef<
	HTMLInputElement,
	FormCalculatorInputProps
>(({ className, label, icon: Icon, isActive, ...props }, ref) => {
	return (
		<div className="space-y-1">
			{label && (
				<label className="text-xs font-medium flex items-center gap-1 text-foreground">
					{Icon && <Icon className="w-3 h-3 text-orange-500" />}
					{label}
				</label>
			)}
			<FormInput
				ref={ref}
				className={cn(
					"rounded-xl",
					isActive && "ring-2 ring-orange-200 border-orange-500",
					className,
				)}
				{...props}
			/>
		</div>
	);
});
FormCalculatorInput.displayName = "FormCalculatorInput";

export { FormCalculatorInput };

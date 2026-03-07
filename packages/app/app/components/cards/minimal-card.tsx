import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";
import { type LucideIcon } from "lucide-react";

const minimalCardVariants = cva(
  "relative overflow-hidden transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-white border-[0.5px] border-gray-200",
        outlined: "bg-transparent border-[0.5px] border-gray-200",
        filled: "border-0",
        ghost: "bg-transparent border-0",
      },
      tone: {
        neutral: "bg-gray-50/80",
        primary: "bg-orange-50/80",
        success: "bg-green-50/80",
        warning: "bg-amber-50/80",
        danger: "bg-red-50/80",
      },
      radius: {
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
      },
      padding: {
        none: "",
        sm: "p-2",
        md: "p-3",
        lg: "p-4",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
      clickable: {
        true: "cursor-pointer",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: ["default", "outlined"],
        interactive: true,
        className: "hover:bg-gray-50/80",
      },
      {
        variant: ["default", "outlined"],
        clickable: true,
        className: "hover:bg-gray-50/80",
      },
      {
        variant: "filled",
        interactive: true,
        className: "hover:opacity-90",
      },
      {
        variant: "filled",
        clickable: true,
        className: "hover:opacity-90",
      },
      {
        variant: "ghost",
        interactive: true,
        className: "hover:bg-gray-100/50",
      },
    ],
    defaultVariants: {
      variant: "default",
      tone: "neutral",
      radius: "md",
      padding: "md",
      interactive: false,
      clickable: false,
    },
  }
);

interface MinimalCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof minimalCardVariants> {}

const MinimalCard = React.forwardRef<HTMLDivElement, MinimalCardProps>(
  (
    {
      className,
      variant,
      tone,
      radius,
      padding,
      interactive,
      clickable,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          minimalCardVariants({ variant, tone, radius, padding, interactive, clickable }),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MinimalCard.displayName = "MinimalCard";

const MinimalCardMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon?: LucideIcon;
    iconColor?: string;
    size?: "sm" | "md" | "lg";
  }
>(({ className, children, icon: Icon, iconColor, size = "md", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  if (Icon) {
    return (
      <div ref={ref} className={cn("flex items-center justify-center", className)} {...props}>
        <Icon className={cn(sizeClasses[size], iconColor || "text-gray-600")} />
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("flex-shrink-0", className)} {...props}>
      {children}
    </div>
  );
});
MinimalCardMedia.displayName = "MinimalCardMedia";

const MinimalCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("flex-1 min-w-0", className)} {...props} />
  );
});
MinimalCardContent.displayName = "MinimalCardContent";

const MinimalCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn("font-semibold text-foreground leading-tight", className)}
      {...props}
    />
  );
});
MinimalCardTitle.displayName = "MinimalCardTitle";

const MinimalCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
MinimalCardDescription.displayName = "MinimalCardDescription";

const MinimalCardActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 flex-shrink-0", className)}
      {...props}
    />
  );
});
MinimalCardActions.displayName = "MinimalCardActions";

export {
  MinimalCard,
  minimalCardVariants,
  MinimalCardMedia,
  MinimalCardContent,
  MinimalCardTitle,
  MinimalCardDescription,
  MinimalCardActions,
};

export type { MinimalCardProps };

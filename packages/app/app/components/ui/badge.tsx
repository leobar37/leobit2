import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-[-0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-white/10 dark:text-white/88 dark:hover:bg-white/14",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline:
          "border-stone-200/80 bg-white/78 text-foreground shadow-none dark:border-white/10 dark:bg-white/6 dark:text-white/88",
        shell:
          "border-stone-200/70 bg-stone-100/90 text-stone-700 shadow-none dark:border-white/10 dark:bg-white/8 dark:text-white/75",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 shadow-none dark:bg-emerald-500/16 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-100 text-amber-800 shadow-none dark:bg-amber-500/16 dark:text-amber-300",
        danger:
          "border-transparent bg-red-100 text-red-700 shadow-none dark:bg-red-500/16 dark:text-red-300",
        info:
          "border-transparent bg-sky-100 text-sky-700 shadow-none dark:bg-sky-500/16 dark:text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

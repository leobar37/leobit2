import { ChevronRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "~/lib/utils";
import type { ReactNode } from "react";

export interface ListCardBadge {
  label: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
  className?: string;
}

export interface ListCardProps {
  /** Icon to display on the left side */
  icon?: LucideIcon;
  /** Color class for the icon */
  iconColor?: string;
  /** Background class for the icon container */
  iconBgColor?: string;
  /** Main title of the card */
  title: string;
  /** Subtitle or secondary text */
  subtitle?: string;
  /** Additional metadata to display below title */
  metadata?: ReactNode;
  /** Badges to display on the right side */
  badges?: ListCardBadge[];
  /** Whether to show the chevron arrow on the right */
  showArrow?: boolean;
  /** Custom right-side content (replaces badges and arrow) */
  rightContent?: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Additional className for the card */
  className?: string;
  /** Whether the card is clickable */
  clickable?: boolean;
  /** Custom content to render below the main row */
  children?: ReactNode;
}

/**
 * Standardized list card component following the mobile list pattern.
 * Uses shell-card-flat styling with rounded-[24px] for consistency.
 *
 * @example
 * <ListCard
 *   icon={ShoppingCart}
 *   iconColor="text-orange-600"
 *   iconBgColor="bg-orange-100"
 *   title="Purchase #123"
 *   subtitle="2024-01-15"
 *   badges={[{ label: "Pending", className: "bg-yellow-100 text-yellow-700" }]}
 *   onClick={() => navigate(`/purchases/123`)}
 * />
 */
export function ListCard({
  icon: Icon,
  iconColor = "text-orange-600",
  iconBgColor = "bg-orange-100/90",
  title,
  subtitle,
  metadata,
  badges,
  showArrow = true,
  rightContent,
  onClick,
  className,
  clickable = true,
  children,
}: ListCardProps) {
  return (
    <Card
      className={cn(
        "shell-card-flat w-full rounded-[24px] transition-colors hover:border-stone-300/90",
        clickable && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className={cn(
                "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] ring-1 ring-orange-100",
                iconBgColor
              )}
            >
              <Icon className={cn("h-6 w-6", iconColor)} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[1.05rem] font-semibold leading-tight text-foreground sm:text-lg">
                  {title}
                </h3>
                {subtitle && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>

              {rightContent ? (
                rightContent
              ) : (
                <div className="flex items-center gap-2 pl-2">
                  {badges?.map((badge, index) => (
                    <Badge
                      key={index}
                      variant={badge.variant || "outline"}
                      className={cn(
                        "rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold leading-none",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </Badge>
                  ))}
                  {showArrow && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground ring-1 ring-stone-200/90">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {metadata && (
              <div className="mt-2 text-sm text-muted-foreground">
                {metadata}
              </div>
            )}
          </div>
        </div>

        {children}
      </CardContent>
    </Card>
  );
}

import { User, Phone, MapPin, CreditCard, CloudOff, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "~/lib/utils";
import type { Customer } from "~/lib/db/schema";

import { useCustomerTags } from "~/hooks/use-customer-tags";
import { TagBadge } from "~/components/tags";

interface CustomerCardProps {
  customer: Customer;
  showDebt?: boolean;
  showTags?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

/**
 * Card component for displaying customer information.
 * Uses shell-card-flat styling for consistency with other list cards.
 */
export function CustomerCard({
  customer,
  showDebt = false,
  showTags = true,
  selectable = false,
  selected = false,
  onSelect,
}: CustomerCardProps) {
  const isPending = customer.syncStatus === "pending";
  const { data: customerTags } = useCustomerTags(customer.id);

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(!selected);
    }
  };

  return (
    <Card
      className={cn(
        "w-full rounded-[24px] transition-colors",
        selected
          ? "bg-orange-500 border-orange-500"
          : "shell-card-flat hover:border-stone-300/90",
        (selectable || !selected) && "cursor-pointer"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon or Checkbox */}
          <div
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors",
              selected
                ? "bg-orange-500 text-white ring-2 ring-white/30"
                : "bg-orange-100 text-orange-600"
            )}
          >
            {selectable && selected ? (
              <Check className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "font-semibold truncate",
                  selected ? "text-white" : "text-foreground"
                )}
              >
                {customer.name}
              </h3>
              {isPending && !selectable && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full flex-shrink-0">
                  <CloudOff className="h-3 w-3" />
                  Sin sincronizar
                </span>
              )}
            </div>

            {/* Tags */}
            {showTags && customerTags && customerTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {customerTags.slice(0, 3).map((ct) => (
                  <TagBadge
                    key={ct.tagId}
                    tag={{ id: ct.tagId, name: ct.tagName, color: ct.tagColor }}
                    size="sm"
                  />
                ))}
                {customerTags.length > 3 && (
                  <span
                    className={cn(
                      "text-xs px-1",
                      selected ? "text-white/70" : "text-muted-foreground"
                    )}
                  >
                    +{customerTags.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="mt-2 space-y-1">
              {customer.dni && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    selected ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{customer.dni}</span>
                </div>
              )}

              {customer.phone && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    selected ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.address && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    selected ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

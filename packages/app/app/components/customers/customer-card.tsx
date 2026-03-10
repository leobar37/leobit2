import { User, Phone, MapPin, CreditCard, CloudOff, Tag, Check } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { cn } from "~/lib/utils";
import type { Customer } from "~/lib/db/schema";

import { useCustomerTags } from "~/hooks/use-customer-tags";
import { TagBadge } from "~/components/tags";
import {
  MinimalCard,
  MinimalCardContent,
  MinimalCardMedia,
} from "~/components/cards";

interface CustomerCardProps {
  customer: Customer;
  showDebt?: boolean;
  showTags?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

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
    <MinimalCard
      variant={selected ? "filled" : "outlined"}
      tone={selected ? "primary" : "neutral"}
      interactive
      clickable={!selectable}
      radius="md"
      className={cn(
        selectable && "cursor-pointer",
        selected && "bg-orange-500"
      )}
      onClick={handleClick}
    >
      <MinimalCardContent className="p-4">
        <div className="flex items-start gap-3">
          {selectable ? (
            <div 
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                selected 
                  ? "bg-orange-500 text-white" 
                  : "bg-orange-100 text-orange-600"
              }`}
            >
              {selected ? (
                <Check className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
          ) : (
            <MinimalCardMedia 
              icon={User} 
              iconColor="text-orange-600" 
              size="md" 
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold truncate ${selected ? "text-white" : "text-foreground"}`}>
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
                  <span className={`text-xs px-1 ${selected ? "text-white/70" : "text-muted-foreground"}`}>
                    +{customerTags.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="mt-2 space-y-1">
              {customer.dni && (
                <div className={`flex items-center gap-2 text-sm ${selected ? "text-white/80" : "text-muted-foreground"}`}>
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{customer.dni}</span>
                </div>
              )}

              {customer.phone && (
                <div className={`flex items-center gap-2 text-sm ${selected ? "text-white/80" : "text-muted-foreground"}`}>
                  <Phone className="h-3.5 w-3.5" />
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.address && (
                <div className={`flex items-center gap-2 text-sm ${selected ? "text-white/80" : "text-muted-foreground"}`}>
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </MinimalCardContent>
    </MinimalCard>
  );
}

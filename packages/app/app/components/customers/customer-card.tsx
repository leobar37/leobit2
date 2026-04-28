import { User, Phone, MapPin, CreditCard, Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "~/lib/utils";
import type { Customer } from "@avileo/shared";

import { useCustomerGroupsWithDetails, type CustomerGroupBadgeItem } from "~/hooks/use-customer-groups-with-details";
import { useCustomerTagsWithDetails, type CustomerTagWithDetails } from "~/hooks/use-customer-tags-with-details";
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
  compact?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onNavigate?: () => void;
  preloadedTags?: CustomerTagWithDetails[];
  preloadedGroups?: CustomerGroupBadgeItem[];
}

export function CustomerCard({
  customer,
  showDebt = false,
  showTags = true,
  compact = false,
  selectable = false,
  selected = false,
  onSelect,
  onNavigate,
  preloadedTags,
  preloadedGroups,
}: CustomerCardProps) {
  const { data: customerTagsQuery } = useCustomerTagsWithDetails(
    preloadedTags ? null : customer.id
  );
  const { data: customerGroupsQuery } = useCustomerGroupsWithDetails(
    preloadedGroups ? null : customer.id
  );
  const customerTags = preloadedTags ?? customerTagsQuery;
  const customerGroups = preloadedGroups ?? customerGroupsQuery;

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectable && onSelect) {
      onSelect(!selected);
    }
  };

  const handleCardClick = () => {
    if (selectable && selected && onSelect) {
      onSelect(false);
    } else if (onNavigate) {
      onNavigate();
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
        selected && "border border-orange-300 bg-orange-50/90 shadow-[0_6px_18px_rgba(249,115,22,0.12)]"
      )}
      onClick={handleCardClick}
    >
      <MinimalCardContent className={cn(compact ? "p-3" : "p-4")}>
        <div className="flex items-start gap-3">
          {selectable ? (
            <button
              type="button"
              onClick={handleSelectClick}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
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
            </button>
          ) : (
            <MinimalCardMedia 
              icon={User} 
              iconColor="text-orange-600" 
              size="md" 
            />
          )}

          <div className="flex-1 min-w-0">
            <h3 className={cn("font-semibold truncate", selected ? "text-orange-950" : "text-foreground")}>
              {customer.name}
            </h3>

            {/* Tags */}
            {showTags && customerTags && customerTags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-0.5">
                {customerTags.slice(0, 3).map((ct) => (
                  <TagBadge
                    key={ct.tagId}
                    tag={{ id: ct.tagId, name: ct.tagName, color: ct.tagColor }}
                    size="xs"
                    className={selected ? "ring-1 ring-white/60" : ""}
                  />
                ))}
                {customerTags.length > 3 && (
                  <span className={cn("text-[10px] px-0.5", selected ? "text-orange-700" : "text-muted-foreground")}>
                    +{customerTags.length - 3}
                  </span>
                )}
              </div>
            )}

            {customerGroups && customerGroups.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {customerGroups.slice(0, 2).map((group) => (
                  <Badge
                    key={group.id}
                    variant="outline"
                    className={cn(
                      "h-5 rounded-full border-orange-200 bg-white/80 px-1.5 text-[10px] font-medium text-orange-700 shadow-none",
                      selected && "border-orange-300 bg-white text-orange-800"
                    )}
                  >
                    <Users className="mr-1 h-3 w-3" />
                    {group.name}
                  </Badge>
                ))}
                {customerGroups.length > 2 && (
                  <span className={cn("text-[10px] px-0.5", selected ? "text-orange-700" : "text-muted-foreground")}>
                    +{customerGroups.length - 2} grupos
                  </span>
                )}
              </div>
            )}

            {!compact && (
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
            )}
          </div>
        </div>
      </MinimalCardContent>
    </MinimalCard>
  );
}

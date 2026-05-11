import { User, Phone, MapPin, CreditCard, Check, CalendarDays, Banknote, Droplets } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/utils";
import { formatRecentDateTime } from "~/lib/date-utils";

import { useCustomerGroupsWithDetails, type CustomerGroupBadgeItem } from "~/hooks/use-customer-groups-with-details";
import { useCustomerTagsWithDetails, type CustomerTagWithDetails } from "~/hooks/use-customer-tags-with-details";
import { TagBadge } from "~/components/tags";
import { useBusinessMode } from "~/hooks/use-business-mode";

interface CustomerCardProps {
  customer: {
    id: string;
    name: string;
    dni?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
    businessId?: string;
    createdBy?: string | null;
    createdAt?: string;
    updatedAt?: string;
    totalDebt?: number;
    lastSaleDate?: string | null;
    waterProfile?: {
      deliveryDays: string[];
      defaultContainerQuantity: number;
      waterRouteName?: string | null;
      preferredRoute: string | null;
    } | null;
  };
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
  const { mode } = useBusinessMode();
  const waterProfile = mode === "agua" ? customer.waterProfile : null;

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
    <div
      className={cn(
        "border-b px-1 py-3 transition-colors last:border-b-0",
        selectable || onNavigate ? "cursor-pointer" : "",
        selected
          ? "border-orange-300 bg-orange-50/70 dark:border-orange-500/35 dark:bg-orange-500/12"
          : "border-border/60 hover:bg-muted/35 dark:border-white/[0.07] dark:hover:bg-white/[0.04]"
      )}
      onClick={handleCardClick}
    >
      <div className={cn(compact ? "p-0" : "p-0")}>
        <div className="flex items-start gap-3">
          {selectable ? (
            <button
              type="button"
              onClick={handleSelectClick}
              className={`mt-0.5 flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                selected
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-border bg-transparent text-muted-foreground hover:border-orange-400 dark:border-white/15"
              }`}
              aria-label={selected ? "Quitar selección" : "Seleccionar cliente"}
            >
              {selected ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-border/70 text-muted-foreground dark:border-white/15">
              <User className="h-3.5 w-3.5" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={cn("truncate text-[0.95rem] font-semibold leading-5", selected ? "text-orange-950 dark:text-orange-100" : "text-foreground")}>
                  {customer.name}
                </h3>

                <div className={cn(
                  "mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs",
                  selected ? "text-orange-700/80 dark:text-orange-200/80" : "text-muted-foreground"
                )}>
                  {customer.lastSaleDate && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      <span className="truncate">{formatRecentDateTime(new Date(customer.lastSaleDate))}</span>
                    </span>
                  )}
                  {customer.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </span>
                  )}
                  {customer.address && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="max-w-[13rem] truncate">{customer.address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {showTags && customerTags && customerTags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {customerTags.slice(0, 3).map((ct) => (
                  <TagBadge
                    key={ct.tagId}
                    tag={{ id: ct.tagId, name: ct.tagName, color: ct.tagColor }}
                    size="xs"
                    className={cn("rounded border px-1.5 shadow-none", selected ? "ring-1 ring-white/60" : "")}
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
                      "h-5 rounded border-border bg-transparent px-1.5 text-[10px] font-medium text-muted-foreground shadow-none dark:border-white/12",
                      selected && "border-orange-300 text-orange-800 dark:border-orange-400/40 dark:text-orange-100"
                    )}
                  >
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

            {showDebt && (customer.totalDebt ?? 0) > 0 && (
              <div className="mt-1 flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 rounded border-red-300 bg-transparent px-1.5 text-[10px] font-medium text-red-600 shadow-none dark:border-red-400/40 dark:text-red-200",
                    selected && "border-red-300 text-red-700 dark:border-red-400/40 dark:text-red-100"
                  )}
                >
                  <Banknote className="mr-1 h-3 w-3" />
                  Debe S/ {formatCurrency(customer.totalDebt!.toFixed(2))}
                </Badge>
              </div>
            )}

            {waterProfile && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className="h-5 rounded border-sky-400/40 bg-transparent px-1.5 text-[10px] font-medium text-sky-700 shadow-none dark:text-sky-200"
                >
                  <Droplets className="mr-1 h-3 w-3" />
                  {waterProfile.defaultContainerQuantity} bidones
                </Badge>
                {(waterProfile.waterRouteName || waterProfile.preferredRoute) && (
                  <Badge
                    variant="outline"
                    className="h-5 rounded border-border bg-transparent px-1.5 text-[10px] font-medium text-muted-foreground shadow-none dark:border-white/12"
                  >
                    {waterProfile.waterRouteName || waterProfile.preferredRoute}
                  </Badge>
                )}
              </div>
            )}

            {!compact && (
              <div className="mt-2 space-y-1">
              {customer.dni && (
                <div className={`flex items-center gap-2 text-sm ${selected ? "text-orange-900/80 dark:text-orange-100/80" : "text-muted-foreground"}`}>
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{customer.dni}</span>
                </div>
              )}

              {customer.phone && (
                <div className={`flex items-center gap-2 text-sm ${selected ? "text-orange-900/80 dark:text-orange-100/80" : "text-muted-foreground"}`}>
                  <Phone className="h-3.5 w-3.5" />
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.address && (
                <div className={`flex items-center gap-2 text-sm ${selected ? "text-orange-900/80 dark:text-orange-100/80" : "text-muted-foreground"}`}>
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { User, Phone, MapPin, CreditCard, CloudOff, Tag } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import type { Customer } from "~/lib/db/schema";
import { isOnline } from "~/lib/sync/utils";
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
}

export function CustomerCard({ customer, showDebt = false, showTags = true }: CustomerCardProps) {
  const isPending = customer.syncStatus === "pending" && !isOnline();
  const { data: customerTags } = useCustomerTags(customer.id);

  return (
    <MinimalCard 
      variant="outlined" 
      interactive 
      clickable 
      radius="md"
    >
      <MinimalCardContent className="p-4">
        <div className="flex items-start gap-3">
          <MinimalCardMedia 
            icon={User} 
            iconColor="text-orange-600" 
            size="md" 
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {customer.name}
              </h3>
              {isPending && (
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
                  <span className="text-xs text-muted-foreground px-1">
                    +{customerTags.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="mt-2 space-y-1">
              {customer.dni && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{customer.dni}</span>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

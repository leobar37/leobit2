import { Package } from "lucide-react";
import type { SaleItem } from "~/hooks/use-sales";
import { cn, formatCurrency } from "~/lib/utils";
import { SaleDetailSection } from "./sale-detail-section";

interface SaleDetailItemsCardProps {
  items: SaleItem[];
  totalAmount: string;
}

export function SaleDetailItemsCard({ items, totalAmount }: SaleDetailItemsCardProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SaleDetailSection
      title="Productos"
      icon={<Package className="h-4 w-4" />}
      action={
        <span className="text-xs font-medium text-muted-foreground">
          {items.length} producto{items.length > 1 ? "s" : ""}
        </span>
      }
    >
      <div className="px-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start justify-between gap-3 py-3.5",
              "border-t shell-divider first:border-0"
            )}
          >
            <div className="flex flex-1 items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-orange-600">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{item.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.quantity)} x S/ {formatCurrency(item.unitPrice)}
                </p>
              </div>
            </div>
            <span className="ml-4 font-semibold text-foreground">
              S/ {formatCurrency(item.subtotal)}
            </span>
          </div>
        ))}

        <div className="flex items-center justify-between border-t shell-divider py-3.5">
          <span className="text-sm text-muted-foreground">Total de productos</span>
          <span className="text-lg font-semibold text-foreground">
            S/ {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </SaleDetailSection>
  );
}

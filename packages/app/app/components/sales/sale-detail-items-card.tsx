import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SaleItem } from "~/hooks/use-sales";
import { formatCurrency } from "~/lib/utils";

interface SaleDetailItemsCardProps {
  items: SaleItem[];
  totalAmount: string;
}

export function SaleDetailItemsCard({ items, totalAmount }: SaleDetailItemsCardProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="shell-card-flat rounded-[28px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Productos Vendidos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between border-b shell-divider py-3 first:pt-0 last:border-0"
          >
            <div className="flex flex-1 items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[16px] bg-orange-100/90 ring-1 ring-orange-100">
                <Package className="h-5 w-5 text-orange-600" />
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
        <div className="flex items-center justify-between border-t shell-divider pt-2">
          <span className="text-muted-foreground">
            {items.length} producto{items.length > 1 ? "s" : ""}
          </span>
          <span className="text-lg font-semibold">S/ {formatCurrency(totalAmount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

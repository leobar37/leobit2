import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Sale } from "~/lib/services/sale-service";
import { cn, formatCurrency } from "~/lib/utils";
import { SaleDetailSection } from "./sale-detail-section";

interface SaleDetailPaymentCardProps {
  sale: Sale;
}

export function SaleDetailPaymentCard({ sale }: SaleDetailPaymentCardProps) {
  const paidAmount = Number(sale.amountPaid ?? 0);
  const totalAmount = Number(sale.totalAmount ?? 0);
  const dueAmount = Math.max(totalAmount - paidAmount, 0);
  const rows = [
    { label: "Total", value: `S/ ${formatCurrency(sale.totalAmount)}` },
    { label: "Abono inicial", value: `S/ ${formatCurrency(paidAmount)}` },
  ];

  return (
    <SaleDetailSection
      title="Pago"
      icon={<CreditCard className="h-4 w-4" />}
      action={
        <Badge className="rounded-md bg-white/80 px-2 text-foreground shadow-none">
          {sale.saleType === "credito" ? "Crédito" : "Contado"}
        </Badge>
      }
    >
      <div className="px-3">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between gap-3 py-3.5",
              "border-t shell-divider first:border-0"
            )}
          >
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-base font-semibold text-foreground">{row.value}</span>
          </div>
        ))}

        <div className="flex items-center justify-between border-t shell-divider py-3.5">
          <span
            className={cn(
              "text-sm font-semibold",
              dueAmount > 0 ? "text-red-600" : "text-emerald-600"
            )}
          >
            {dueAmount > 0 ? "Pendiente" : "Estado"}
          </span>

          {dueAmount > 0 ? (
            <span className="text-lg font-semibold text-red-600">
              S/ {formatCurrency(dueAmount)}
            </span>
          ) : (
            <Badge className="rounded-md bg-emerald-100 px-2 text-emerald-700 shadow-none">
              Sin deuda
            </Badge>
          )}
        </div>
      </div>
    </SaleDetailSection>
  );
}

import { Link } from "react-router";
import { CreditCard, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomerBalance } from "~/hooks/use-customer-balance";
import type { Sale } from "~/hooks/use-sales";
import { useCustomerPayments } from "~/hooks/use-payments";
import { cn, formatCurrency } from "~/lib/utils";
import { decimalToNumber } from "@avileo/shared";
import { SaleDetailSection } from "./sale-detail-section";

interface SaleDetailPaymentCardProps {
  sale: Sale;
}

export function SaleDetailPaymentCard({ sale }: SaleDetailPaymentCardProps) {
  const { data: customerPayments = [] } = useCustomerPayments(sale.customerId ?? null);
  const { data: customerBalance, isLoading: isBalanceLoading } = useCustomerBalance(sale.customerId ?? null);
  const paidAmount = decimalToNumber(sale.amountPaid);
  const totalAmount = decimalToNumber(sale.totalAmount);
  const linkedPaidAmount = customerPayments
    .filter((payment) => payment.relatedSaleId === sale.id)
    .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);
  const effectivePaidAmount = Math.max(paidAmount, linkedPaidAmount);
  const saleDueAmount = sale.saleType === "credito"
    ? Math.max(totalAmount - effectivePaidAmount, 0)
    : 0;
  const dueAmount = isBalanceLoading
    ? saleDueAmount
    : Math.min(saleDueAmount, customerBalance.balanceDue);
  const rows = [
    { label: "Total", value: `S/ ${formatCurrency(sale.totalAmount)}` },
    { label: "Abonado", value: `S/ ${formatCurrency(effectivePaidAmount)}` },
  ];

  return (
    <SaleDetailSection
      title="Pago"
      icon={<CreditCard className="h-4 w-4" />}
      action={
        <Badge variant="outline" className="rounded-md px-2">
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
              dueAmount > 0 ? "text-red-500 dark:text-red-300" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {dueAmount > 0 ? "Pendiente" : "Estado"}
          </span>

          {dueAmount > 0 ? (
            <span className="text-lg font-semibold text-red-500 dark:text-red-300">
              S/ {formatCurrency(dueAmount)}
            </span>
          ) : (
            <Badge className="rounded-md bg-emerald-100 px-2 text-emerald-700 shadow-none">
              Sin deuda
            </Badge>
          )}
        </div>

        {sale.saleType === "credito" && sale.customerId && dueAmount > 0 ? (
          <Button asChild className="mb-3 h-11 w-full rounded-xl bg-orange-500 hover:bg-orange-600">
            <Link
              to={`/cobros/nuevo?clienteId=${sale.customerId}&saleId=${sale.id}`}
              data-testid="register-sale-abono-link"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Registrar abono de esta venta
            </Link>
          </Button>
        ) : null}
      </div>
    </SaleDetailSection>
  );
}

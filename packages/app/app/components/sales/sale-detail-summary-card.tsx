import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCustomerBalance } from "~/hooks/use-customer-balance";
import { useCustomerPayments } from "~/hooks/use-payments";
import type { Sale } from "~/hooks/use-sales";
import { formatCurrency } from "~/lib/utils";
import { decimalToNumber } from "@avileo/shared";

interface SaleDetailSummaryCardProps {
  sale: Sale;
}

export function SaleDetailSummaryCard({ sale }: SaleDetailSummaryCardProps) {
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

  const saleWorkflowStatus =
    sale.status === "draft"
      ? "Borrador"
      : sale.status === "confirmed"
        ? "Confirmada"
        : sale.status === "active"
          ? "Activa"
          : sale.status === "delivered"
            ? "Entregada"
            : "Cancelada";

  const saleStatus =
    sale.saleType === "contado"
      ? "Pago total"
      : effectivePaidAmount <= 0
        ? "Debe todo"
        : dueAmount > 0
          ? "A cuenta"
          : "Sin deuda";

  const getWorkflowBadgeVariant = () => {
    switch (sale.status) {
      case "draft":
        return "warning";
      case "active":
        return "success";
      case "confirmed":
        return "info";
      case "delivered":
        return "purple";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getPaymentBadgeVariant = () => {
    if (sale.saleType === "contado") {
      return "success";
    }
    if (effectivePaidAmount <= 0) {
      return "danger";
    }
    if (dueAmount > 0) {
      return "info";
    }
    return "success";
  };

  return (
    <section className="shell-card-flat rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/15 dark:text-orange-300">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={getWorkflowBadgeVariant() as any}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none"
              >
                {saleWorkflowStatus}
              </Badge>
              <Badge
                variant={getPaymentBadgeVariant() as any}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none"
              >
                {saleStatus}
              </Badge>
              {sale.saleType === "credito" && (
                <Badge
                  variant="primary"
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none"
                >
                  Crédito
                </Badge>
              )}
            </div>

            <p className="mt-3 truncate text-lg font-bold tracking-tight text-foreground">
              {sale.type === "pre_order" ? "Pedido" : "Venta"} #{sale.id.slice(-6)}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {sale.customer?.name || "Cliente general"}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="mt-0.5 text-2xl font-bold tracking-[-0.04em] text-foreground">
            S/ {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t shell-divider pt-3">
        <div className="shell-card-soft rounded-xl px-3 py-2">
          <p className="text-xs text-muted-foreground">Abonado</p>
          <p className="mt-1 font-semibold text-foreground">
            S/ {formatCurrency(effectivePaidAmount)}
          </p>
        </div>

        <div className="shell-card-soft rounded-xl px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {sale.saleType === "credito" ? "Saldo" : "Estado"}
          </p>
          <p
            className={`mt-1 font-semibold ${
              sale.saleType === "credito" && dueAmount > 0
                ? "text-red-500 dark:text-red-300"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {sale.saleType === "credito"
              ? `S/ ${formatCurrency(dueAmount)}`
              : "Pagado"}
          </p>
        </div>
      </div>
    </section>
  );
}

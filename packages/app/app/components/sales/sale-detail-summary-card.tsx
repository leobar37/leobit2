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
    <section className="overflow-hidden rounded-2xl shell-card-flat">
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-orange-700/80">
              {saleWorkflowStatus}
            </p>

            <div className="mt-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold tracking-tight text-foreground">
                  {sale.type === "pre_order" ? "Pedido" : "Venta"} #{sale.id.slice(-6)}
                  {sale.type === "pre_order" && (
                    <span className="ml-2 inline-flex items-center rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
                      Pedido
                    </span>
                  )}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {sale.customer?.name || "Cliente general"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold tracking-[-0.04em] text-foreground">
                  S/ {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge
                variant={getWorkflowBadgeVariant() as any}
                className="rounded-md px-2 py-0.5 text-xs font-medium"
              >
                {saleWorkflowStatus}
              </Badge>

              <Badge
                variant={getPaymentBadgeVariant() as any}
                className="rounded-md px-2 py-0.5 text-xs font-medium"
              >
                {saleStatus}
              </Badge>

              {sale.saleType === "credito" && (
                <Badge
                  variant="primary"
                  className="rounded-md px-2 py-0.5 text-xs font-medium"
                >
                  Crédito
                </Badge>
              )}
            </div>

          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t shell-divider pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Abonado</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              S/ {formatCurrency(effectivePaidAmount)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              {sale.saleType === "credito" ? "Saldo pendiente" : "Estado"}
            </p>
             <p
              className={`mt-1 text-lg font-semibold ${
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
      </div>
    </section>
  );
}

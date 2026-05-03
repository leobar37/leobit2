import { XCircle } from "lucide-react";
import type { Sale } from "~/hooks/use-sales";
import { formatCurrency } from "~/lib/utils";
import { decimalToNumber } from "@avileo/shared";

interface SaleCancelledCardProps {
  sale: Sale;
}

export function SaleCancelledCard({ sale }: SaleCancelledCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-red-200/80 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/10">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-red-600">
          <XCircle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-400">Venta cancelada</p>
          <p className="text-sm text-red-600 dark:text-red-300">
            Cancelada el{" "}
            {sale.cancelledAt
              ? new Date(sale.cancelledAt).toLocaleDateString("es-PE")
              : ""}
            {sale.cancelReason && ` - ${sale.cancelReason}`}
          </p>
          {sale.refundAmount && decimalToNumber(sale.refundAmount) > 0 && (
            <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-300">
              Reembolso: S/ {formatCurrency(sale.refundAmount)}
              {sale.refundMethod && ` vía ${sale.refundMethod}`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

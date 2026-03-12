import { XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Sale } from "~/hooks/use-sales";
import { formatCurrency } from "~/lib/utils";

interface SaleCancelledCardProps {
  sale: Sale;
}

export function SaleCancelledCard({ sale }: SaleCancelledCardProps) {
  return (
    <Card className="border-red-200 bg-red-50 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <XCircle className="h-6 w-6 text-red-600" />
          <div>
            <p className="font-semibold text-red-700">Venta Cancelada</p>
            <p className="text-sm text-red-600">
              Cancelada el {sale.cancelledAt ? new Date(sale.cancelledAt).toLocaleDateString("es-PE") : ""}
              {sale.cancelReason && ` - ${sale.cancelReason}`}
            </p>
            {sale.refundAmount && Number(sale.refundAmount) > 0 && (
              <p className="mt-1 text-sm font-medium text-red-600">
                Reembolso: S/ {formatCurrency(sale.refundAmount)}
                {sale.refundMethod && ` via ${sale.refundMethod}`}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

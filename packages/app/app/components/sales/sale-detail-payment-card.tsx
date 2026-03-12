import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Sale } from "~/hooks/use-sales";
import { formatCurrency } from "~/lib/utils";

interface SaleDetailPaymentCardProps {
  sale: Sale;
}

export function SaleDetailPaymentCard({ sale }: SaleDetailPaymentCardProps) {
  const paidAmount = Number(sale.amountPaid ?? 0);
  const dueAmount = Number(sale.balanceDue ?? 0);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resumen de Pago</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="text-lg font-semibold">S/ {formatCurrency(sale.totalAmount)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Abono inicial</span>
          <span>S/ {formatCurrency(paidAmount)}</span>
        </div>

        {dueAmount > 0 ? (
          <div className="flex items-center justify-between border-t pt-3">
            <span className="font-medium text-red-600">Pendiente</span>
            <span className="font-semibold text-red-600">S/ {formatCurrency(dueAmount)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t pt-3">
            <span className="font-medium text-green-600">Estado</span>
            <Badge className="bg-green-100 text-green-700">Sin deuda</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

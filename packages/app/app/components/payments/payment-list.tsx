import { Wallet, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Payment } from "~/hooks/use-payments";

interface PaymentListProps {
  payments: Payment[];
  emptyMessage?: string;
}

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
};

export function PaymentList({ payments, emptyMessage = "No hay abonos" }: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedPayments.map((payment) => (
        <Card key={payment.id} className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-600">
                    S/ {parseFloat(payment.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(payment.createdAt).toLocaleDateString("es-PE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>                
              </div>
            </div>

            {payment.notes && (
              <p className="mt-2 text-sm text-muted-foreground bg-gray-50 p-2 rounded-lg">
                {payment.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

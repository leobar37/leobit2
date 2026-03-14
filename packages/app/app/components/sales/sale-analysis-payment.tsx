import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatCurrency } from "~/lib/utils";

interface PaymentStatus {
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentPercentage: number;
  isFullyPaid: boolean;
  status: "paid" | "partial" | "pending";
}

interface SaleAnalysisPaymentProps {
  paymentStatus: PaymentStatus | null;
}

export function SaleAnalysisPayment({ paymentStatus }: SaleAnalysisPaymentProps) {
  if (!paymentStatus) {
    return (
      <Card className="shell-card-flat rounded-[28px]">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No hay datos de pago disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totalAmount, amountPaid, balanceDue, paymentPercentage, isFullyPaid, status } =
    paymentStatus;

  const getStatusConfig = () => {
    switch (status) {
      case "paid":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-100",
          label: "Pagado completo",
        };
      case "partial":
        return {
          icon: Clock,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          label: "Pago parcial",
        };
      default:
        return {
          icon: AlertCircle,
          color: "text-red-600",
          bgColor: "bg-red-100",
          label: "Pendiente de pago",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4">
      <Card className="shell-card-flat rounded-[28px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-500" />
            Estado de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            <div
              className={`w-20 h-20 ${statusConfig.bgColor} rounded-full flex items-center justify-center`}
            >
              <StatusIcon className={`h-10 w-10 ${statusConfig.color}`} />
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold">{statusConfig.label}</p>
            <p className="text-sm text-muted-foreground">
              {paymentPercentage}% pagado
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                isFullyPaid
                  ? "bg-green-500"
                  : paymentPercentage > 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">S/ {formatCurrency(totalAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pagado</p>
              <p className="font-semibold text-green-600">S/ {formatCurrency(amountPaid)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p
                className={`font-semibold ${
                  balanceDue > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                S/ {formatCurrency(balanceDue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

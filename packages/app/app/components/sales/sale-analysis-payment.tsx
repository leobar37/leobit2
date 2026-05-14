import { CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { SaleDetailSection } from "./sale-detail-section";

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
      <SaleDetailSection
        title="Estado de pago"
        icon={<CreditCard className="h-4 w-4" />}
      >
        <div className="p-4">
          <p className="text-center text-muted-foreground">
            No hay datos de pago disponibles
          </p>
        </div>
      </SaleDetailSection>
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
    <SaleDetailSection
      title="Estado de pago"
      icon={<CreditCard className="h-4 w-4" />}
      action={
        <span className="text-xs font-medium text-muted-foreground">
          {paymentPercentage}% pagado
        </span>
      }
    >
      <div className="space-y-3 p-3">
        <div className="shell-card-soft flex items-center gap-3 rounded-xl px-3 py-3">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${statusConfig.bgColor}`}
          >
            <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{statusConfig.label}</p>
            <p className="text-sm text-muted-foreground">
              S/ {formatCurrency(amountPaid)} de S/ {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${
              isFullyPaid
                ? "bg-green-500"
                : paymentPercentage > 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="shell-card-soft rounded-xl px-2.5 py-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="mt-1 font-semibold">S/ {formatCurrency(totalAmount)}</p>
          </div>
          <div className="shell-card-soft rounded-xl px-2.5 py-2">
            <p className="text-xs text-muted-foreground">Pagado</p>
            <p className="mt-1 font-semibold text-green-600">
              S/ {formatCurrency(amountPaid)}
            </p>
          </div>
          <div className="shell-card-soft rounded-xl px-2.5 py-2">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p
              className={`mt-1 font-semibold ${
                balanceDue > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              S/ {formatCurrency(balanceDue)}
            </p>
          </div>
        </div>
      </div>
    </SaleDetailSection>
  );
}

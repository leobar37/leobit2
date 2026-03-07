import * as React from "react";
import { Wallet } from "lucide-react";
import { cn, formatCurrency } from "~/lib/utils";

interface BalanceCardProps {
  balance: number;
  onRegisterPayment?: () => void;
  className?: string;
}

type BalanceStatus = "positive" | "zero" | "negative";

interface BalanceConfig {
  status: BalanceStatus;
  borderColor: string;
  bgColor: string;
  textColor: string;
  label: string;
  amountText: string;
  showPaymentButton: boolean;
}

function getBalanceConfig(balance: number): BalanceConfig {
  if (balance > 0) {
    return {
      status: "positive",
      borderColor: "border-l-red-500",
      bgColor: "bg-white",
      textColor: "text-red-600",
      label: "Deuda total",
      amountText: `S/ ${formatCurrency(balance)}`,
      showPaymentButton: true,
    };
  }

  if (balance < 0) {
    return {
      status: "negative",
      borderColor: "border-l-blue-500",
      bgColor: "bg-white",
      textColor: "text-blue-600",
      label: "Saldo a favor",
      amountText: `S/ ${formatCurrency(Math.abs(balance))}`,
      showPaymentButton: false,
    };
  }

  return {
    status: "zero",
    borderColor: "border-l-green-500",
    bgColor: "bg-white",
    textColor: "text-green-600",
    label: "Sin deuda",
    amountText: "S/ 0.00",
    showPaymentButton: false,
  };
}

const BalanceCard = React.forwardRef<HTMLDivElement, BalanceCardProps>(
  ({ balance, onRegisterPayment, className }, ref) => {
    const config = getBalanceConfig(balance);

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border-l-4 border-0 shadow-sm",
          config.borderColor,
          config.bgColor,
          className
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className={cn("h-5 w-5", config.textColor)} />
              <span className="text-muted-foreground">{config.label}</span>
            </div>
            <span className={cn("text-2xl font-bold", config.textColor)}>
              {config.amountText}
            </span>
          </div>

          {config.showPaymentButton && onRegisterPayment && (
            <button
              onClick={onRegisterPayment}
              className="w-full mt-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl px-4 py-2 font-medium flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              registrar pago
            </button>
          )}
        </div>
      </div>
    );
  }
);

BalanceCard.displayName = "BalanceCard";

export { BalanceCard, getBalanceConfig };
export type { BalanceCardProps, BalanceConfig, BalanceStatus };

import * as React from "react";
import { Wallet } from "lucide-react";
import { cn } from "~/lib/utils";

interface BalanceCardProps {
  balance: number;
  onRegisterPayment?: () => void;
  className?: string;
}

type BalanceStatus = "positive" | "zero" | "negative";

interface BalanceConfig {
  status: BalanceStatus;
  gradient: string;
  label: string;
  amountText: string;
  showPaymentButton: boolean;
}

function getBalanceConfig(balance: number): BalanceConfig {
  if (balance > 0) {
    return {
      status: "positive",
      gradient: "bg-gradient-to-br from-red-500 to-red-600",
      label: "Deuda total",
      amountText: `S/ ${balance.toFixed(2)}`,
      showPaymentButton: true,
    };
  }

  if (balance < 0) {
    return {
      status: "negative",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
      label: "Saldo a favor",
      amountText: `S/ ${Math.abs(balance).toFixed(2)}`,
      showPaymentButton: false,
    };
  }

  return {
    status: "zero",
    gradient: "bg-gradient-to-br from-green-500 to-green-600",
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
          "rounded-2xl border-0 shadow-md text-white",
          config.gradient,
          className
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 opacity-80" />
              <span className="opacity-90">{config.label}</span>
            </div>
            <span className="text-2xl font-bold">{config.amountText}</span>
          </div>

          {config.showPaymentButton && onRegisterPayment && (
            <button
              onClick={onRegisterPayment}
              className="w-full mt-4 bg-white text-red-600 hover:bg-white/90 rounded-xl px-4 py-2 font-medium flex items-center justify-center gap-2"
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
              Registrar pago
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

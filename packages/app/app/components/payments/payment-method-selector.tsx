import { Wallet, Receipt, CreditCard, Building2, Smartphone } from "lucide-react";
import { cn } from "~/lib/utils";
import type { PaymentMethod } from "~/hooks/use-payment-capture";

const methodConfig: Record<
  PaymentMethod,
  { label: string; icon: React.ReactNode }
> = {
  efectivo: { label: "Efectivo", icon: <Wallet className="h-5 w-5" /> },
  yape: { label: "Yape", icon: <Smartphone className="h-5 w-5" /> },
  plin: { label: "Plin", icon: <Smartphone className="h-5 w-5" /> },
  transferencia: { label: "Transferencia", icon: <Building2 className="h-5 w-5" /> },
  tarjeta: { label: "Tarjeta", icon: <CreditCard className="h-5 w-5" /> },
  saldo: { label: "Saldo", icon: <Receipt className="h-5 w-5" /> },
};

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({
  methods,
  selectedMethod,
  onSelect,
  disabled,
}: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {methods.map((method) => {
        const config = methodConfig[method];
        const isSelected = selectedMethod === method;

        return (
          <button
            key={method}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(method)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl py-4 shadow-sm transition-colors",
              isSelected
                ? "bg-orange-500 text-white shadow-orange-500/15"
                : "bg-muted/70 text-muted-foreground shadow-black/[0.03] hover:bg-accent",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {config.icon}
            <span className="text-sm font-medium">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

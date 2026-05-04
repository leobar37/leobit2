import { Wallet, Receipt, CreditCard, Building2, Smartphone, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import type { PaymentMethod } from "~/hooks/use-payment-capture";

const methodIcons: Record<PaymentMethod, React.ReactNode> = {
  efectivo: <Wallet className="h-5 w-5" />,
  yape: <Smartphone className="h-5 w-5" />,
  plin: <Smartphone className="h-5 w-5" />,
  transferencia: <Building2 className="h-5 w-5" />,
  tarjeta: <CreditCard className="h-5 w-5" />,
  saldo: <Receipt className="h-5 w-5" />,
};

const methodLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  saldo: "Saldo",
};

interface PaymentSummaryProps {
  method: PaymentMethod | null;
  hasProof: boolean;
  onClick: () => void;
}

export function PaymentSummary({ method, hasProof, onClick }: PaymentSummaryProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
        method
          ? "border-orange-500/30 bg-orange-500/[0.08]"
          : "border-border bg-card hover:bg-accent"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          method
            ? "bg-orange-500 text-white"
            : "bg-muted text-muted-foreground"
        )}
      >
        {method ? methodIcons[method] : <Wallet className="h-5 w-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("font-medium", method && "text-orange-700 dark:text-orange-300")}>
          {method ? methodLabels[method] : "Seleccionar método de pago"}
        </p>
        {method && hasProof && (
          <p className="text-xs text-muted-foreground">Con comprobante</p>
        )}
      </div>

      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

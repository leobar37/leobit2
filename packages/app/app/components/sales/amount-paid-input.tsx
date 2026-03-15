import { memo, useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "~/lib/utils";

interface AmountPaidInputProps {
  saleId: string;
  totalAmount: number;
  initialAmount: string;
  onUpdate: (amount: string, balanceDue: string) => Promise<void>;
}

export const AmountPaidInput = memo(function AmountPaidInput({
  saleId,
  totalAmount,
  initialAmount,
  onUpdate,
}: AmountPaidInputProps) {
  const [value, setValue] = useState(initialAmount || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync with external changes
  useEffect(() => {
    setValue(initialAmount || "");
  }, [initialAmount]);

  const handleBlur = useCallback(async () => {
    const numValue = parseFloat(value) || 0;
    const newBalanceDue = Math.max(totalAmount - numValue, 0);

    setIsUpdating(true);
    try {
      await onUpdate(value, newBalanceDue.toFixed(2));
    } finally {
      setIsUpdating(false);
    }
  }, [value, totalAmount, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    },
    []
  );

  const numValue = parseFloat(value) || 0;
  const isValid = numValue > 0 && numValue <= totalAmount;
  const showError = value !== "" && !isValid;

  return (
    <div className="space-y-3 border-t pt-3 shell-divider">
      <label className="text-sm font-medium">Monto pagado (S/)</label>
      <Input
        type="number"
        min="0"
        placeholder="0.00"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={isUpdating}
        className="rounded-2xl border-white/70 bg-white/72 text-lg shadow-sm"
      />
      {showError && (
        <p className="text-sm text-red-500">
          El monto debe ser mayor a 0 y menor o igual a S/ {formatCurrency(totalAmount)}
        </p>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-medium">S/ {formatCurrency(totalAmount)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Saldo pendiente:</span>
        <span className="font-medium text-orange-600">
          S/ {formatCurrency(Math.max(totalAmount - numValue, 0))}
        </span>
      </div>
    </div>
  );
});

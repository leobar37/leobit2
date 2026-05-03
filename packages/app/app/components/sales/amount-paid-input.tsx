import { memo, useCallback } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "~/lib/utils";
import { useOptimisticField } from "~/hooks/use-optimistic-field";

interface AmountPaidInputProps {
  saleId: string;
  totalAmount: number;
  initialAmount: string;
  onUpdate: (amount: string) => Promise<void>;
}

export const AmountPaidInput = memo(function AmountPaidInput({
  totalAmount,
  initialAmount,
  onUpdate,
}: AmountPaidInputProps) {
  const optimistic = useOptimisticField({
    initialValue: initialAmount || "",
    onUpdate,
    debounceMs: 400,
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const filtered = raw
        .replace(/[^0-9.]/g, "")
        .replace(/(\.[^.]*)\./g, "$1");
      optimistic.setValue(filtered);
    },
    [optimistic]
  );

  const handleBlur = useCallback(() => {
    const numValue = parseFloat(optimistic.value) || 0;

    if (numValue <= 0 || numValue > totalAmount) {
      return;
    }

    optimistic.flush();
  }, [optimistic, totalAmount]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    },
    []
  );

  const numValue = parseFloat(optimistic.value) || 0;
  const isValid = numValue > 0 && numValue <= totalAmount;
  const showError = optimistic.value !== "" && !isValid;

  return (
    <div className="space-y-3 border-t pt-3 shell-divider">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Monto pagado (S/)</label>
        {optimistic.isSaving ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando
          </span>
        ) : optimistic.lastSavedValue === optimistic.value && optimistic.value !== "" ? (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Guardado
          </span>
        ) : null}
      </div>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={optimistic.value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="rounded-2xl border-white/70 bg-white/72 text-lg shadow-sm"
      />
      {showError && (
        <p className="text-sm text-red-500">
          El monto debe ser mayor a 0 y menor o igual a S/{" "}
          {formatCurrency(totalAmount)}
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

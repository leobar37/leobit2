import { CreditCard } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface OrderPaymentSelectorProps {
  value: "contado" | "credito";
  onChange: (value: "contado" | "credito") => void;
}

export function OrderPaymentSelector({
  value,
  onChange,
}: OrderPaymentSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Forma de pago
      </Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={value === "contado" ? "default" : "outline"}
          onClick={() => onChange("contado")}
          className="flex-1 rounded-xl"
        >
          Contado
        </Button>
        <Button
          type="button"
          variant={value === "credito" ? "default" : "outline"}
          onClick={() => onChange("credito")}
          className="flex-1 rounded-xl"
        >
          Crédito
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { X, Wallet, Banknote, Smartphone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePayment } from "~/hooks/use-payments";

interface PaymentFormProps {
  clientId: string;
  onClose: () => void;
  maxAmount?: number;
}

const paymentMethods = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "yape", label: "Yape", icon: Smartphone },
  { value: "plin", label: "Plin", icon: Smartphone },
  { value: "transferencia", label: "Transferencia", icon: Building2 },
];

export function PaymentForm({ clientId, onClose, maxAmount }: PaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [notes, setNotes] = useState("");
  const createPayment = useCreatePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) return;
    if (maxAmount && amountNum > maxAmount) {
      alert(`El monto no puede exceder S/ ${maxAmount.toFixed(2)}`);
      return;
    }

    try {
      await createPayment.mutateAsync({
        clientId,
        amount: amountNum.toFixed(2),
        paymentMethod: paymentMethod as "efectivo" | "yape" | "plin" | "transferencia",
        notes: notes || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Error creating payment:", error);
      alert("Error al registrar el abono");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <Card className="w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl border-0 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-500" />
            Registrar Abono
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Monto (S/)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-xl text-lg"
                autoFocus
              />
              {maxAmount && (
                <p className="text-xs text-muted-foreground">
                  Máximo: S/ {maxAmount.toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.value}
                      type="button"
                      variant={paymentMethod === method.value ? "default" : "outline"}
                      onClick={() => setPaymentMethod(method.value)}
                      className={`rounded-xl ${
                        paymentMethod === method.value
                          ? "bg-orange-500 hover:bg-orange-600"
                          : ""
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {method.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
                className="rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={createPayment.isPending || !amount}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
            >
              {createPayment.isPending ? "Guardando..." : "Registrar Abono"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

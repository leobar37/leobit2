import { useSearchParams, useNavigate } from "react-router";
import { ArrowLeft, Wallet, User, AlertCircle, Check, Receipt, ImageIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetLayout } from "~/components/layout/app-layout";
import { useCustomer } from "~/hooks/use-customers";
import { useCreatePayment } from "~/hooks/use-payments";
import { useAccountsReceivable } from "~/hooks/use-accounts-receivable";
import { formatCurrency } from "~/lib/formatting";

const paymentSchema = z.object({
  amount: z.string().min(1, "El monto es requerido"),
  paymentMethod: z.enum(["efectivo", "yape", "plin", "transferencia"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const paymentMethods = [
  { id: "efectivo" as const, label: "Efectivo", icon: Wallet },
  { id: "yape" as const, label: "Yape", icon: Receipt },
  { id: "plin" as const, label: "Plin", icon: Receipt },
  { id: "transferencia" as const, label: "Transferencia", icon: Receipt },
];

function QuickAmountButton({
  amount,
  onClick,
  disabled,
}: {
  amount: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg"
    >
      S/ {amount}
    </Button>
  );
}

export default function NuevoCobroPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const customerId = searchParams.get("clienteId");

  useSetLayout({
    title: "Registrar pago",
    showBackButton: true,
    backHref: customerId ? `/clientes/${customerId}` : "/cobros",
  });

  const { data: customer } = useCustomer(customerId || "");
  const { data: accounts } = useAccountsReceivable();
  const createPayment = useCreatePayment();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentDebt = useMemo(() => {
    if (!customerId || !accounts) return 0;
    const account = accounts.find((a) => a.customer.id === customerId);
    return account?.totalDebt || 0;
  }, [customerId, accounts]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paymentMethod: "efectivo",
      referenceNumber: "",
      notes: "",
    },
  });

  const amount = watch("amount");
  const paymentMethod = watch("paymentMethod");

  const parsedAmount = parseFloat(amount) || 0;
  const remainingDebt = Math.max(0, currentDebt - parsedAmount);

  useEffect(() => {
    if (customerId && currentDebt > 0) {
      setValue("amount", currentDebt.toFixed(2));
    }
  }, [customerId, currentDebt, setValue]);

  const onSubmit = async (data: PaymentFormData) => {
    if (!customerId) return;

    try {
      setSubmitError(null);
      await createPayment.mutateAsync({
        clientId: customerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber || undefined,
        notes: data.notes || undefined,
      });

      navigate(customerId ? `/clientes/${customerId}` : "/cobros");
    } catch {
      setSubmitError("No se pudo registrar el pago. Intenta nuevamente.");
    }
  };

  if (!customerId) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p>No se especificó un cliente</p>
        <Button className="mt-4" onClick={() => navigate("/cobros")}>
          Ver deudores
        </Button>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando cliente...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="border-0 shadow-md rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold">{customer.name}</h3>
              {customer.phone && (
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md rounded-2xl">
        <CardContent className="p-4">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Deuda actual</p>
            <p className="text-4xl font-bold text-red-600">
              {formatCurrency(currentDebt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto a pagar</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                S/
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={currentDebt}
                className="pl-10 text-lg font-semibold"
                {...register("amount")}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              onClick={() => setValue("amount", currentDebt.toFixed(2))}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Todo (liquidar)
            </Button>
            {[50, 100, 200].map((amt) => (
              <QuickAmountButton
                key={amt}
                amount={amt}
                disabled={amt > currentDebt}
                onClick={() => setValue("amount", Math.min(amt, currentDebt).toFixed(2))}
              />
            ))}
          </div>

          {parsedAmount > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Deuda:</span>
                <span className="font-medium">{formatCurrency(currentDebt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Abono:</span>
                <span className="font-medium text-green-600">-{formatCurrency(parsedAmount)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>Queda:</span>
                <span className={remainingDebt > 0 ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(remainingDebt)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {submitError}
        </p>
      )}

      <Card className="border-0 shadow-md rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <Label>Método de pago</Label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;
              return (
                <Button
                  key={method.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setValue("paymentMethod", method.id)}
                  className={`h-auto py-3 flex flex-col items-center gap-1 ${
                    isSelected ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{method.label}</span>
                </Button>
              );
            })}
          </div>

          {(paymentMethod === "yape" ||
            paymentMethod === "plin" ||
            paymentMethod === "transferencia") && (
            <div className="space-y-2">
              <Label htmlFor="reference">Número de operación</Label>
              <Input
                id="reference"
                placeholder="Ej: 123456"
                {...register("referenceNumber")}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <textarea
              id="notes"
              placeholder="Observaciones del pago..."
              rows={2}
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full h-14 text-lg font-semibold bg-orange-500 hover:bg-orange-600"
        disabled={isSubmitting || !parsedAmount || parsedAmount <= 0}
      >
        {isSubmitting ? (
          "Registrando..."
        ) : (
          <>
            <Check className="mr-2 h-5 w-5" />
            Confirmar pago
          </>
        )}
      </Button>
    </form>
  );
}

import { useSearchParams, useNavigate } from "react-router";
import { formatNumber } from "~/lib/utils";
import { Wallet, User, AlertCircle, Check, Receipt, Camera, X, QrCode, Phone } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { useCustomer } from "~/hooks/use-customers";
import { useCreatePayment, useUpdatePayment } from "~/hooks/use-payments";
import { useCustomerBalance } from "~/hooks/use-customer-balance";
import { validateFile } from "~/hooks/use-files";
import { isOnline } from "~/lib/is-online";
import { uploadFileNow } from "~/hooks/use-files";
import { usePaymentMethodsConfig } from "~/hooks/use-payment-methods-config";
import { calculateBalanceDue, formatCurrency, parseAmount } from "~/lib/utils";
import { FormPage } from "~/components/layout/form-page";

const paymentSchema = z.object({
  amount: z.string().min(1, "El monto es requerido"),
  paymentMethod: z.enum(["efectivo", "yape", "plin", "transferencia", "tarjeta"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const paymentMethods = [
  { id: "efectivo" as const, label: "Efectivo", icon: Wallet },
  { id: "yape" as const, label: "Yape", icon: Receipt },
  { id: "plin" as const, label: "Plin", icon: Receipt },
  { id: "transferencia" as const, label: "Transferencia", icon: Receipt },
  { id: "tarjeta" as const, label: "Tarjeta", icon: Receipt },
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
      className="h-10 rounded-xl border-stone-200/90 bg-white/85 px-4 text-sm font-medium shadow-none hover:bg-white"
    >
      S/ {amount}
    </Button>
  );
}

interface PaymentMethodInfoProps {
  method: "yape" | "plin" | "transferencia";
  config: ReturnType<typeof usePaymentMethodsConfig>["data"];
}

function PaymentMethodInfo({ method, config }: PaymentMethodInfoProps) {
  const methodConfig = config?.methods?.[method];
  
  if (!methodConfig) return null;

  return (
    <div className="shell-card-soft rounded-[20px] p-4 space-y-3">
      <div className="flex items-center gap-2 text-blue-800 font-medium">
        <QrCode className="h-4 w-4" />
        <span>Datos para el pago</span>
      </div>

      {methodConfig.qrImageUrl ? (
        <div className="space-y-2">
          <p className="text-sm text-blue-700">Escanea el código QR para pagar:</p>
          <div className="shell-field inline-block rounded-[18px] p-3">
            <img
              src={methodConfig.qrImageUrl}
              alt={`Código QR ${method}`}
              className="max-h-40 w-auto object-contain"
            />
          </div>
        </div>
      ) : null}

      {methodConfig.phone ? (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-blue-600" />
          <span className="text-blue-800">
            Número: <strong>{methodConfig.phone}</strong>
          </span>
        </div>
      ) : null}

      {methodConfig.accountName ? (
        <p className="text-sm text-blue-700">
          Titular: <strong>{methodConfig.accountName}</strong>
        </p>
      ) : null}

      {method === "transferencia" && methodConfig.bank ? (
        <div className="space-y-1 text-sm text-blue-700">
          <p>Banco: <strong>{methodConfig.bank}</strong></p>
          {methodConfig.accountNumber && (
            <p>Cuenta: <strong>{methodConfig.accountNumber}</strong></p>
          )}
          {methodConfig.cci && (
            <p>CCI: <strong>{methodConfig.cci}</strong></p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function NuevoCobroPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const customerId = searchParams.get("clienteId");

  const { data: customer } = useCustomer(customerId || "");
  const { data: customerBalance } = useCustomerBalance(customerId);
  const { data: paymentConfig } = usePaymentMethodsConfig();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDebt = useMemo(() => {
    if (!customerId || !customerBalance) return 0;
    return customerBalance.balanceDue || 0;
  }, [customerBalance, customerId]);

  const enabledPaymentMethods = useMemo(() => {
    const config = paymentConfig?.methods;
    return paymentMethods.filter(
      (method) => !config || config[method.id]?.enabled !== false
    );
  }, [paymentConfig]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    mode: "onChange",
    defaultValues: {
      amount: "",
      paymentMethod: "efectivo",
      referenceNumber: "",
      notes: "",
    },
  });

  const amount = watch("amount");
  const paymentMethod = watch("paymentMethod");

  const parsedAmount = parseAmount(amount);
  const remainingDebt = calculateBalanceDue(currentDebt, parsedAmount);

  useEffect(() => {
    if (customerId && currentDebt > 0) {
      setValue("amount", formatCurrency(currentDebt));
    }
  }, [customerId, currentDebt, setValue]);

  useEffect(() => {
    return () => {
      if (proofPreview) {
        URL.revokeObjectURL(proofPreview);
      }
    };
  }, [proofPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }
    setProofImage(file);
    setProofPreview(URL.createObjectURL(file));
    setSubmitError(null);
  };

  const clearImage = () => {
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }
    setProofImage(null);
    setProofPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!customerId) return;

    try {
      setSubmitError(null);

      let proofImageId: string | undefined;

      const paymentId = await createPayment({
        customerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber || undefined,
        notes: data.notes || undefined,
      });

      if (proofImage && isOnline()) {
        const uploadedFile = await uploadFileNow(proofImage);
        proofImageId = uploadedFile.id;
        await updatePayment(paymentId, { proofImageId });
      }

      navigate(customerId ? `/clientes/${customerId}` : "/cobros");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el pago. Intenta nuevamente.";
      setSubmitError(message);
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

  const showMethodInfo = ["yape", "plin", "transferencia"].includes(paymentMethod);

  return (
    <FormPage
      title="Registrar pago"
      backHref={customerId ? `/clientes/${customerId}` : "/cobros"}
      useLayout
      toolbar={
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || !isValid || !parsedAmount || parsedAmount <= 0 || currentDebt === 0}
          data-testid="save-abono-button"
          className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold shadow-sm hover:bg-orange-600 disabled:bg-orange-300 disabled:text-white disabled:opacity-100"
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
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <Card className="shell-card-flat rounded-[24px]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-orange-100/90 ring-1 ring-orange-100">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold leading-tight">{customer.name}</h3>
                {customer.phone && (
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shell-card-flat rounded-[24px]">
          <CardContent className="p-5">
            <div className="text-center">
              <p className="mb-1 text-sm text-muted-foreground">Deuda actual</p>
              <p className="text-[clamp(2.3rem,10vw,2.8rem)] font-bold tracking-[-0.05em] text-red-600">
                S/ {formatCurrency(currentDebt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Saldo pendiente por cobrar</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shell-card-flat rounded-[24px]">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-semibold text-foreground">
                Monto a pagar
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                  S/
                </span>
                <NumericInput
                  id="amount"
                  data-testid="abono-monto-input"
                  decimals={2}
                  min="0.01"
                  max={currentDebt}
                  className="shell-field h-14 rounded-[16px] border-stone-200/90 bg-white/90 pl-10 pr-4 text-2xl font-bold tracking-[-0.04em] shadow-none focus-visible:ring-1 focus-visible:ring-orange-200"
                  {...register("amount")}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => setValue("amount", formatCurrency(currentDebt))}
                className="h-10 rounded-xl border border-red-200 bg-red-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
              >
                Todo (liquidar)
              </Button>
              {[50, 100, 200].map((amt) => (
                <QuickAmountButton
                  key={amt}
                  amount={amt}
                  disabled={amt > currentDebt}
                  onClick={() => setValue("amount", formatNumber(Math.min(amt, currentDebt)))}
                />
              ))}
            </div>

            {parsedAmount > 0 && (
              <div className="shell-block-muted space-y-2 rounded-[16px] px-4 py-3">
                <div className="flex justify-between text-[15px]">
                  <span>Deuda:</span>
                  <span className="font-medium">S/ {formatCurrency(currentDebt)}</span>
                </div>
                <div className="flex justify-between text-[15px]">
                  <span>Abono:</span>
                  <span className="font-medium text-green-600">-S/ {formatCurrency(parsedAmount)}</span>
                </div>
                <div className="flex justify-between border-t shell-divider pt-2 text-[15px] font-semibold">
                  <span>Queda:</span>
                  <span className={remainingDebt > 0 ? "text-red-600" : "text-green-600"}>
                    S/ {formatCurrency(remainingDebt)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {submitError && (
          <p className="rounded-[16px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {submitError}
          </p>
        )}

        <Card className="shell-card-flat rounded-[24px]">
          <CardContent className="p-4 space-y-4">
            <Label className="text-base font-semibold text-foreground">Método de pago</Label>
            <div className="grid grid-cols-2 gap-3">
              {enabledPaymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <Button
                    key={method.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setValue("paymentMethod", method.id)}
                    className={`h-auto rounded-[16px] border-stone-200/90 py-3.5 shadow-none flex flex-col items-center gap-1.5 ${
                      isSelected ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-white/80 hover:bg-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{method.label}</span>
                  </Button>
                );
              })}
            </div>

            {showMethodInfo && paymentConfig && (
              <PaymentMethodInfo
                method={paymentMethod as "yape" | "plin" | "transferencia"}
                config={paymentConfig}
              />
            )}

            {(paymentMethod === "yape" ||
              paymentMethod === "plin" ||
              paymentMethod === "transferencia") && (
              <div className="space-y-2">
                <Label htmlFor="reference">Número de operación (opcional)</Label>
                <Input
                  id="reference"
                  placeholder="Ej: 123456"
                  className="shell-field h-12 rounded-[16px] px-4 shadow-none focus-visible:ring-1 focus-visible:ring-orange-200"
                  {...register("referenceNumber")}
                />
              </div>
            )}

            {(paymentMethod === "yape" ||
              paymentMethod === "plin" ||
              paymentMethod === "transferencia") && (
              <div className="space-y-2">
                <Label>Comprobante de pago (opcional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {proofPreview ? (
                  <div className="relative">
                    <img
                      src={proofPreview}
                      alt="Comprobante"
                      className="h-32 w-full rounded-[18px] object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2 rounded-xl"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="shell-field h-16 w-full rounded-[16px] border-dashed text-sm shadow-none hover:bg-white"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Adjuntar captura de pantalla
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <textarea
                id="notes"
                placeholder="Observaciones del pago..."
                rows={2}
                className="shell-field flex min-h-[88px] w-full rounded-[16px] px-4 py-3 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("notes")}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </FormPage>
  );
}

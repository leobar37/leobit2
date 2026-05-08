import { useSearchParams, useNavigate } from "react-router";
import { formatNumber } from "~/lib/utils";
import { User, AlertCircle, Check, Wallet } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { useCustomer } from "~/hooks/use-customers";
import { useSale } from "~/hooks/use-sales";
import { useCreatePayment, useUpdatePayment } from "~/hooks/use-payments";
import { useCustomerBalance } from "~/hooks/use-customer-balance";
import { useCustomerPayments } from "~/hooks/use-payments";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { useCocheraDebts, useCreateCocheraDebtPayment } from "~/hooks/use-cochera-debts";
import { calculateBalanceDue, formatCurrency, parseAmount } from "~/lib/utils";
import { FormPage } from "~/components/layout/form-page";
import { useWrapperForm, WrapperFormProvider } from "~/hooks/use-wrapper-form";
import { fileField } from "~/lib/forms/media-field-resolvers";
import { PaymentShareDrawer } from "~/components/payments/payment-share-drawer";
import { PaymentCapture } from "~/components/payments/payment-capture";
import { useUploadFile } from "~/hooks/use-files";
import type { PaymentMethod } from "~/components/payments/payment-capture";

const paymentSchema = z.object({
  amount: z.string().min(1, "El monto es requerido"),
  paymentMethod: z.enum(["efectivo", "yape", "plin", "transferencia", "tarjeta", "saldo"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  proofImageId: z.string().optional(),
});
const cocheraPaymentSchema = paymentSchema.extend({
  paymentMethod: z.enum(["efectivo", "yape", "plin"]),
});

type PaymentFormData = z.infer<typeof paymentSchema>;
type CocheraPaymentFormData = z.infer<typeof cocheraPaymentSchema>;

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
      className="h-10 rounded-xl border-border bg-card px-4 text-sm font-medium shadow-none hover:bg-accent"
    >
      S/ {amount}
    </Button>
  );
}

function NuevoCobroCocheraPage({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const { data: debtsData, isLoading } = useCocheraDebts();
  const createPayment = useCreateCocheraDebtPayment();
  const uploadFile = useUploadFile();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debt = debtsData?.items.find((item) => item.id === sessionId) ?? null;

  const wrapperForm = useWrapperForm<CocheraPaymentFormData>({
    resolver: zodResolver(cocheraPaymentSchema),
    mode: "onChange",
    defaultValues: {
      amount: "",
      paymentMethod: "efectivo",
      referenceNumber: "",
      notes: "",
      proofImageId: undefined,
    },
    fields: {
      proofImageId: fileField(),
    },
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = wrapperForm;

  const amount = watch("amount");
  const paymentMethod = watch("paymentMethod");
  const referenceNumber = watch("referenceNumber");
  const proofImageId = watch("proofImageId");
  const currentDebt = parseAmount(debt?.balanceDue ?? "0");
  const parsedAmount = parseAmount(amount);
  const remainingDebt = calculateBalanceDue(currentDebt, parsedAmount);

  useEffect(() => {
    if (debt && currentDebt > 0 && !amount) {
      setValue("amount", formatCurrency(currentDebt), {
        shouldValidate: true,
      });
    }
  }, [debt?.id]);

  const onSubmit = async (data: CocheraPaymentFormData) => {
    if (!debt) return;

    try {
      setSubmitError(null);
      await createPayment.mutateAsync({
        sessionId: debt.id,
        input: {
          amount: parseAmount(data.amount),
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber || undefined,
          notes: data.notes || undefined,
          proofImageId: data.proofImageId || undefined,
        },
      });
      toast.success("Pago registrado correctamente");
      navigate("/cobros");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el pago. Intenta nuevamente.";
      setSubmitError(message);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando deuda...</div>;
  }

  if (!debt) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p>No se encontró una deuda pendiente para esta sesión</p>
        <Button className="mt-4" onClick={() => navigate("/cobros")}>
          Ver deudas
        </Button>
      </div>
    );
  }

  return (
    <FormPage
      title="Cobrar deuda"
      backHref="/cobros"
      toolbar={
        <Button
          type="submit"
          form="cochera-cobro-form"
          disabled={
            isSubmitting ||
            createPayment.isPending ||
            !isValid ||
            !parsedAmount ||
            parsedAmount <= 0 ||
            parsedAmount > currentDebt
          }
          data-testid="save-cochera-abono-button"
          className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold shadow-sm hover:bg-orange-600 disabled:bg-orange-300 disabled:text-white disabled:opacity-100"
        >
          {isSubmitting || createPayment.isPending ? (
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
      <WrapperFormProvider form={wrapperForm}>
        <form id="cochera-cobro-form" onSubmit={wrapperForm.handleResolvedSubmit(onSubmit)} className="space-y-3.5">
          <Card className="shell-card-flat rounded-[24px] !border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-orange-100/90 ring-1 ring-orange-100 dark:bg-orange-500/15 dark:ring-orange-500/20">
                  <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold leading-tight">{debt.plate}</h3>
                  <p className="text-sm text-muted-foreground">
                    {debt.responsibleName || "Sin responsable"}
                    {debt.responsiblePhone ? ` · ${debt.responsiblePhone}` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shell-card-flat rounded-[24px] !border-0">
            <CardContent className="p-5">
              <div className="text-center">
                <p className="mb-1 text-sm text-muted-foreground">Deuda actual</p>
                <p className="text-[clamp(2.3rem,10vw,2.8rem)] font-bold tracking-[-0.05em] text-destructive">
                  S/ {formatCurrency(currentDebt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Saldo pendiente por cobrar</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shell-card-flat rounded-[24px] !border-0">
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
                    data-testid="cochera-abono-monto-input"
                    decimals={2}
                    min="0.01"
                    max={currentDebt}
                    className="shell-field h-14 rounded-[16px] pl-10 pr-4 text-2xl font-bold tracking-[-0.04em] shadow-none focus-visible:ring-1 focus-visible:ring-orange-200"
                    {...register("amount")}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setValue("amount", formatCurrency(currentDebt), { shouldValidate: true })}
                  className="h-10 rounded-xl border border-destructive/30 bg-red-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
                >
                  Todo (liquidar)
                </Button>
                {[10, 20, 50].map((amt) => (
                  <QuickAmountButton
                    key={amt}
                    amount={amt}
                    disabled={amt > currentDebt}
                    onClick={() => setValue("amount", formatNumber(Math.min(amt, currentDebt)), { shouldValidate: true })}
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
                    <span>Pago:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">-S/ {formatCurrency(parsedAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t shell-divider pt-2 text-[15px] font-semibold">
                    <span>Queda:</span>
                    <span className={remainingDebt > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>
                      S/ {formatCurrency(remainingDebt)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {submitError && (
            <p className="rounded-[16px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <Card className="shell-card-flat rounded-[24px] !border-0">
            <CardContent className="p-4 space-y-4">
              <PaymentCapture
                variant="inline"
                methods={["efectivo", "yape", "plin"]}
                paymentMethod={paymentMethod as PaymentMethod}
                onPaymentMethodChange={(m) => setValue("paymentMethod", m as "efectivo" | "yape" | "plin")}
                referenceNumber={referenceNumber || ""}
                onReferenceNumberChange={(r) => setValue("referenceNumber", r)}
                proofImageId={proofImageId || null}
                onProofUpload={async (file) => {
                  const result = await uploadFile.mutateAsync(file);
                  setValue("proofImageId", result.id);
                }}
                onProofRemove={() => setValue("proofImageId", undefined)}
                isUploading={uploadFile.isPending}
              />

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
      </WrapperFormProvider>
    </FormPage>
  );
}

function NuevoCobroPolleriaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const customerId = searchParams.get("clienteId");
  const saleId = searchParams.get("saleId") || undefined;

  const { data: customer } = useCustomer(customerId || "");
  const { data: sale } = useSale(saleId || null);
  const { data: customerBalance } = useCustomerBalance(customerId);
  const { data: customerPayments = [] } = useCustomerPayments(customerId);
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const uploadFile = useUploadFile();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdPayment, setCreatedPayment] = useState<{
    id: string;
    amount: string;
  } | null>(null);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);

  const currentDebt = useMemo(() => {
    if (!customerId || !customerBalance) return 0;
    const customerDebt = customerBalance.balanceDue || 0;

    if (!saleId || !sale) {
      return customerDebt;
    }

    const saleTotal = parseAmount(String(sale.totalAmount));
    const initialPaid = parseAmount(String(sale.amountPaid));
    const linkedPaid = customerPayments
      .filter((payment) => payment.relatedSaleId === saleId)
      .reduce((sum, payment) => sum + parseAmount(payment.amount), 0);
    const saleDebt = Math.max(saleTotal - Math.max(initialPaid, linkedPaid), 0);

    return Math.min(customerDebt, saleDebt);
  }, [customerBalance, customerId, customerPayments, sale, saleId]);

  const wrapperForm = useWrapperForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    mode: "onChange",
    defaultValues: {
      amount: "",
      paymentMethod: "efectivo",
      referenceNumber: "",
      notes: "",
      proofImageId: undefined,
    },
    fields: {
      proofImageId: fileField(),
    },
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = wrapperForm;

  const amount = watch("amount");
  const paymentMethod = watch("paymentMethod");
  const referenceNumber = watch("referenceNumber");
  const proofImageId = watch("proofImageId");

  const parsedAmount = parseAmount(amount);
  const remainingDebt = calculateBalanceDue(currentDebt, parsedAmount);

  // Auto-fill amount only when customer changes and amount is empty
  useEffect(() => {
    if (customerId && currentDebt > 0 && !amount) {
      setValue("amount", formatCurrency(currentDebt), {
        shouldValidate: true,
      });
    }
  }, [customerId]);

  const onSubmit = async (data: PaymentFormData) => {
    if (!customerId) return;

    try {
      setSubmitError(null);

      let created = await createPayment({
        customerId,
        relatedSaleId: saleId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber || undefined,
        notes: data.notes || undefined,
      });

      if (data.proofImageId) {
        created = await updatePayment(created.id, { proofImageId: data.proofImageId });
      }

      setCreatedPayment({
        id: created.id,
        amount: created.amount,
      });
      setShareDrawerOpen(true);
      toast.success("Pago registrado correctamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el pago. Intenta nuevamente.";
      setSubmitError(message);
    }
  };

  const handleShareDrawerChange = (open: boolean) => {
    setShareDrawerOpen(open);

    if (!open && createdPayment) {
      navigate(customerId ? `/clientes/${customerId}` : "/cobros");
    }
  };

  if (!customerId) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
    <FormPage
      title="Registrar pago"
      backHref={customerId ? `/clientes/${customerId}` : "/cobros"}
      toolbar={
        <Button
          type="submit"
          form="cobro-form"
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
      <WrapperFormProvider form={wrapperForm}>
      <form id="cobro-form" onSubmit={wrapperForm.handleResolvedSubmit(onSubmit)} className="space-y-3.5">
        <Card className="shell-card-flat rounded-[24px] !border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-orange-100/90 ring-1 ring-orange-100 dark:bg-orange-500/15 dark:ring-orange-500/20">
                <User className="h-5 w-5 text-orange-600 dark:text-orange-300" />
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

        <Card className="shell-card-flat rounded-[24px] !border-0">
          <CardContent className="p-5">
            <div className="text-center">
              <p className="mb-1 text-sm text-muted-foreground">Deuda actual</p>
                <p className="text-[clamp(2.3rem,10vw,2.8rem)] font-bold tracking-[-0.05em] text-destructive">
                S/ {formatCurrency(currentDebt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Saldo pendiente por cobrar</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shell-card-flat rounded-[24px] !border-0">
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
                  className="shell-field h-14 rounded-[16px] pl-10 pr-4 text-2xl font-bold tracking-[-0.04em] shadow-none focus-visible:ring-1 focus-visible:ring-orange-200"
                  {...register("amount")}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => setValue("amount", formatCurrency(currentDebt))}
                className="h-10 rounded-xl border border-destructive/30 bg-red-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
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
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">-S/ {formatCurrency(parsedAmount)}</span>
                </div>
                <div className="flex justify-between border-t shell-divider pt-2 text-[15px] font-semibold">
                  <span>Queda:</span>
                  <span className={remainingDebt > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>
                    S/ {formatCurrency(remainingDebt)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {submitError && (
          <p className="rounded-[16px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <Card className="shell-card-flat rounded-[24px] !border-0">
          <CardContent className="p-4 space-y-4">
            <PaymentCapture
              variant="inline"
              paymentMethod={paymentMethod}
              onPaymentMethodChange={(m) => setValue("paymentMethod", m)}
              referenceNumber={referenceNumber || ""}
              onReferenceNumberChange={(r) => setValue("referenceNumber", r)}
              proofImageId={proofImageId || null}
              onProofUpload={async (file) => {
                const result = await uploadFile.mutateAsync(file);
                setValue("proofImageId", result.id);
              }}
              onProofRemove={() => setValue("proofImageId", undefined)}
              isUploading={uploadFile.isPending}
            />

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
      </WrapperFormProvider>
      <PaymentShareDrawer
        open={shareDrawerOpen}
        onOpenChange={handleShareDrawerChange}
        paymentId={createdPayment?.id ?? null}
        amount={createdPayment?.amount ?? amount}
      />
    </FormPage>
  );
}

export default function NuevoCobroPage() {
  const [searchParams] = useSearchParams();
  const { is } = useBusinessMode();
  const cocheraSessionId = searchParams.get("cocheraSessionId");

  if (is.cochera && cocheraSessionId) {
    return <NuevoCobroCocheraPage sessionId={cocheraSessionId} />;
  }

  if (is.cochera) {
    return <NuevoCobroCocheraMissingPage />;
  }

  return <NuevoCobroPolleriaPage />;
}

function NuevoCobroCocheraMissingPage() {
  const navigate = useNavigate();

  return (
    <div className="text-center py-8">
      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
      <p>No se especificó una deuda de cochera</p>
      <Button className="mt-4" onClick={() => navigate("/cobros")}>
        Ver deudas
      </Button>
    </div>
  );
}

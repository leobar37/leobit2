import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CarFront,
  Loader2,
  Banknote,
  Smartphone,
  QrCode,
  Clock,
  Tag,
  AlertCircle,
  CreditCard,
  User,
  MessageSquare,
} from "lucide-react";
import { MobileShell } from "~/components/mobile/mobile-shell";
import { MobileSlot } from "~/components/mobile/mobile-slots";
import { MobilePage } from "~/components/mobile/mobile-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCocheraSessions } from "~/hooks/use-cochera-sessions";
import { useCocheraSettings } from "~/hooks/use-cochera-settings";
import { useCocheraCheckout } from "~/hooks/use-cochera-checkout";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { cn } from "~/lib/utils";

const PAYMENT_OPTIONS = [
  { id: "efectivo" as const, label: "Efectivo", icon: Banknote },
  { id: "yape" as const, label: "Yape", icon: Smartphone },
  { id: "plin" as const, label: "Plin", icon: QrCode },
];

const PAYMENT_MODE_OPTIONS = [
  { id: "pago_total" as const, label: "Pago total", description: "Cobra el total ahora" },
  { id: "a_cuenta" as const, label: "A cuenta", description: "Cobra una parte y deja saldo" },
  { id: "debe_todo" as const, label: "Debe todo", description: "Sale sin pago recibido" },
];

type PaymentMode = (typeof PAYMENT_MODE_OPTIONS)[number]["id"];

function formatElapsedTime(minutes: number): string {
  if (minutes < 1) return "Menos de 1 min";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} h`;
  return `${hrs} h ${mins} min`;
}

export default function CocheraCobrarPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { is } = useBusinessMode();
  const { data: sessions } = useCocheraSessions(undefined, { enabled: is.cochera });
  const { data: settings } = useCocheraSettings({ enabled: is.cochera });
  const checkoutMutation = useCocheraCheckout();

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("pago_total");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "yape" | "plin">("efectivo");
  const [discountInput, setDiscountInput] = useState("");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");

  const session = useMemo(() => {
    return sessions?.find((s) => s.id === id);
  }, [sessions, id]);

  const elapsedMinutes = useMemo(() => {
    if (!session) return 0;
    const entry = new Date(session.entryAt);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - entry.getTime()) / 1000 / 60));
  }, [session]);

  const preview = useMemo(() => {
    if (!session || !settings) return null;

    const grace = settings.graceMinutes ?? 0;
    const rate = Number(settings.hourlyRate) || 0;
    const discount = Number(discountInput) || 0;

    const billableMinutes = Math.max(0, elapsedMinutes - grace);
    const billableHours = Math.ceil(billableMinutes / 60);
    const rawAmount = billableHours * rate - discount;
    const totalAmount = Math.max(0, rawAmount);

    return {
      durationMinutes: elapsedMinutes,
      billableHours,
      hourlyRate: rate,
      discount,
      totalAmount,
    };
  }, [session, settings, elapsedMinutes, discountInput]);

  const acceptedMethods = useMemo(() => {
    return new Set(settings?.acceptedPaymentMethods ?? ["efectivo"]);
  }, [settings]);

  const settlementPreview = useMemo(() => {
    if (!preview) return null;

    const totalAmount = preview.totalAmount;
    const amountPaid =
      paymentMode === "pago_total"
        ? totalAmount
        : paymentMode === "debe_todo"
          ? 0
          : Number(amountPaidInput) || 0;

    return {
      amountPaid: Math.max(0, amountPaid),
      balanceDue: Math.max(0, totalAmount - Math.max(0, amountPaid)),
    };
  }, [preview, paymentMode, amountPaidInput]);

  const validationMessage = useMemo(() => {
    if (!preview) return null;

    if (paymentMode !== "debe_todo" && !acceptedMethods.has(paymentMethod)) {
      return "El método de pago no está habilitado en configuración.";
    }

    if (paymentMode === "a_cuenta") {
      const amountPaid = Number(amountPaidInput) || 0;
      if (amountPaid <= 0) return "Ingresa un monto a cuenta mayor a cero.";
      if (amountPaid >= preview.totalAmount) return "El monto a cuenta debe ser menor al total.";
      if (!responsibleName.trim()) return "Ingresa el responsable del saldo pendiente.";
    }

    if (paymentMode === "debe_todo" && !responsibleName.trim()) {
      return "Ingresa el responsable de la deuda.";
    }

    return null;
  }, [acceptedMethods, amountPaidInput, paymentMethod, paymentMode, preview, responsibleName]);

  const submitLabel =
    paymentMode === "pago_total"
      ? "Confirmar cobro"
      : paymentMode === "a_cuenta"
        ? "Registrar salida a cuenta"
        : "Registrar salida con deuda";

  const handleSubmit = useCallback(async () => {
    if (!id) return;
    const discount = Number(discountInput) || 0;
    const amountPaid = Number(amountPaidInput) || 0;
    await checkoutMutation.mutateAsync({
      id,
      input: {
        paymentMode,
        amountPaid: paymentMode === "a_cuenta" ? amountPaid : undefined,
        paymentMethod: paymentMode === "debe_todo" ? undefined : paymentMethod,
        responsibleName:
          paymentMode === "pago_total" ? undefined : responsibleName.trim(),
        responsiblePhone:
          paymentMode === "pago_total" || !responsiblePhone.trim()
            ? undefined
            : responsiblePhone.trim(),
        notes: settlementNotes.trim() || undefined,
        discount,
      },
    });
    navigate("/cochera");
  }, [
    id,
    discountInput,
    amountPaidInput,
    paymentMode,
    paymentMethod,
    responsibleName,
    responsiblePhone,
    settlementNotes,
    checkoutMutation,
    navigate,
  ]);

  if (!is.cochera) {
    return (
      <MobileShell.Root variant="protected">
        <MobileShell.BackButton>
          <Link
            to="/dashboard"
            className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </MobileShell.BackButton>
        <MobileShell.Content>
          <MobilePage.Root maxWidth="md">
            <div className="text-center space-y-4 py-12">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                <CarFront className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Modo no disponible</h2>
                <p className="text-sm text-muted-foreground">
                  El cobro de vehículos solo está disponible para cocheras.
                </p>
              </div>
            </div>
          </MobilePage.Root>
        </MobileShell.Content>
      </MobileShell.Root>
    );
  }

  if (!session) {
    return (
      <MobileShell.Root variant="protected">
        <MobileShell.BackButton>
          <Link
            to="/cochera"
            className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </MobileShell.BackButton>
        <MobileShell.Content>
          <MobilePage.Root maxWidth="md">
            <div className="text-center space-y-4 py-12">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                <CarFront className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Vehículo no encontrado</h2>
                <p className="text-sm text-muted-foreground">
                  La sesión ya no está activa o no existe.
                </p>
              </div>
            </div>
          </MobilePage.Root>
        </MobileShell.Content>
      </MobileShell.Root>
    );
  }

  return (
    <MobileShell.Root variant="protected">
      <MobileShell.BackButton>
        <Link
          to="/cochera"
          className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </MobileShell.BackButton>

      <MobileSlot name="header:center" priority={10}>
        <div className="flex min-w-0 items-center gap-2 flex-1">
          <CarFront className="h-5 w-5 text-orange-600 shrink-0" />
          <h1 className="font-bold text-lg truncate">Cobrar</h1>
        </div>
      </MobileSlot>

      <MobileShell.Content>
        <MobilePage.Root maxWidth="md">
          <div className="space-y-6">
            {/* Vehicle summary */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Placa</p>
                  <p className="text-2xl font-bold tracking-wide">{session.plate}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground capitalize">
                  {session.vehicleType}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Entró: {new Date(session.entryAt).toLocaleTimeString("es-PE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Tiempo transcurrido: {formatElapsedTime(elapsedMinutes)}</span>
              </div>
            </div>

            {/* Calculation preview */}
            {preview && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-800">Tiempo facturable</span>
                  <span className="font-medium text-orange-900">
                    {preview.billableHours} h
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-800">Tarifa por hora</span>
                  <span className="font-medium text-orange-900">
                    S/ {preview.hourlyRate.toFixed(2)}
                  </span>
                </div>
                {preview.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-800">Descuento</span>
                    <span className="font-medium text-orange-900">
                      -S/ {preview.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t border-orange-200 pt-2 flex items-center justify-between">
                  <span className="font-semibold text-orange-900">Total a pagar</span>
                  <span className="text-xl font-bold text-orange-700">
                    S/ {preview.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Settlement mode */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Forma de salida</p>
              <div className="grid gap-2">
                {PAYMENT_MODE_OPTIONS.map((option) => {
                  const isSelected = paymentMode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      data-testid={`cochera-payment-mode-${option.id}`}
                      onClick={() => setPaymentMode(option.id)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all",
                        isSelected
                          ? "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-500/60 dark:bg-orange-500/15 dark:text-orange-100"
                          : "border-border bg-card text-foreground hover:border-orange-200 dark:hover:border-orange-500/40"
                      )}
                    >
                      <div>
                        <p className="font-semibold">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      <CreditCard
                        className={cn(
                          "h-5 w-5",
                          isSelected ? "text-orange-600 dark:text-orange-300" : "text-muted-foreground"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment method */}
            {paymentMode !== "debe_todo" && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Método de pago</p>
              <div className="grid grid-cols-3 gap-3">
                {PAYMENT_OPTIONS.map((option) => {
                  const isAccepted = acceptedMethods.has(option.id);
                  const isSelected = paymentMethod === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      data-testid={`cochera-payment-${option.id}`}
                      disabled={!isAccepted}
                      onClick={() => setPaymentMethod(option.id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-4 text-sm font-medium transition-all",
                        !isAccepted && "opacity-40 cursor-not-allowed",
                        isSelected
                          ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/60 dark:bg-orange-500/15 dark:text-orange-200"
                          : isAccepted
                            ? "border-border bg-card text-muted-foreground hover:border-orange-200 dark:hover:border-orange-500/40"
                            : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      <option.icon className="h-6 w-6" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {paymentMode === "a_cuenta" && (
              <div className="space-y-2">
                <label htmlFor="amountPaid" className="text-sm font-medium flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Monto pagado a cuenta (S/)
                </label>
                <Input
                  id="amountPaid"
                  data-testid="cochera-amount-paid-input"
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="0.00"
                  value={amountPaidInput}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                  className="h-12 rounded-xl text-base"
                />
              </div>
            )}

            {paymentMode !== "pago_total" && (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-medium">Responsable del saldo</p>
                <div className="space-y-2">
                  <label htmlFor="responsibleName" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nombre *
                  </label>
                  <Input
                    id="responsibleName"
                    data-testid="cochera-responsible-name-input"
                    placeholder="Ej: Juan Pérez"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="responsiblePhone" className="text-sm font-medium">Teléfono opcional</label>
                  <Input
                    id="responsiblePhone"
                    data-testid="cochera-responsible-phone-input"
                    inputMode="tel"
                    placeholder="Ej: 999 999 999"
                    value={responsiblePhone}
                    onChange={(e) => setResponsiblePhone(e.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </div>
              </div>
            )}

            {/* Discount */}
            <div className="space-y-2">
              <label htmlFor="discount" className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Descuento opcional (S/)
              </label>
              <Input
                id="discount"
                data-testid="cochera-discount-input"
                type="number"
                min={0}
                step={0.1}
                placeholder="0.00"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="settlementNotes" className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Nota de salida opcional
              </label>
              <Input
                id="settlementNotes"
                data-testid="cochera-settlement-notes-input"
                placeholder="Ej: pagará mañana"
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
            </div>

            {settlementPreview && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cobrado ahora</span>
                  <span className="font-semibold">S/ {settlementPreview.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saldo pendiente</span>
                  <span className={cn(
                    "font-semibold",
                    settlementPreview.balanceDue > 0 ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"
                  )}>
                    S/ {settlementPreview.balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {validationMessage && (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 dark:text-amber-300" />
                <p className="text-sm text-amber-800 dark:text-amber-100">{validationMessage}</p>
              </div>
            )}

            {/* Error */}
            {checkoutMutation.isError && (
              <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 p-4">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error al cobrar</p>
                  <p className="text-sm text-red-700">
                    {checkoutMutation.error instanceof Error
                      ? checkoutMutation.error.message
                      : "No se pudo completar el cobro. Intenta de nuevo."}
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                data-testid="cochera-checkout-submit"
                disabled={checkoutMutation.isPending || Boolean(validationMessage)}
                className="h-14 w-full rounded-xl bg-orange-500 text-lg font-semibold hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Banknote className="mr-2 h-5 w-5" />
                    {submitLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
        </MobilePage.Root>
      </MobileShell.Content>
    </MobileShell.Root>
  );
}

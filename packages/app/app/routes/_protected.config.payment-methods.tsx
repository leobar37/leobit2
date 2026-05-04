import { Link } from "react-router";
import { FormProvider } from "react-hook-form";
import {
  ArrowLeft,
  CreditCard,
  Save,
  Loader2,
  Smartphone,
  Building2,
  Wallet,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "~/components/mobile/mobile-shell";
import { MobileSlot } from "~/components/mobile/mobile-slots";
import { MobilePage } from "~/components/mobile/mobile-page";
import { MobileFixedFooter } from "~/components/mobile/mobile-fixed-footer";
import { PaymentMethodCard } from "~/components/payments/payment-method-card";
import { usePaymentMethodsForm } from "~/hooks/use-payment-methods-form";

const METHOD_DEFINITIONS = [
  {
    id: "efectivo" as const,
    name: "Efectivo",
    icon: Wallet,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    id: "yape" as const,
    name: "Yape",
    icon: Smartphone,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    id: "plin" as const,
    name: "Plin",
    icon: QrCode,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: "transferencia" as const,
    name: "Transferencia",
    icon: Building2,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  {
    id: "tarjeta" as const,
    name: "Tarjeta",
    icon: CreditCard,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
];

export default function PaymentMethodsConfigPage() {
  const { form, onSubmit, isLoading, isPending, isDirty, isValid } = usePaymentMethodsForm();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <MobileShell.Root variant="protected">
          <MobileShell.BackButton>
            <Link
              to="/config"
              className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </MobileShell.BackButton>

          <MobileSlot name="header:center" priority={10}>
            <div className="flex min-w-0 items-center gap-2 flex-1">
              <CreditCard className="h-5 w-5 text-orange-600 shrink-0" />
              <h1 className="font-bold text-lg truncate">Métodos de Pago</h1>
            </div>
          </MobileSlot>

          <MobileShell.Content>
            <MobilePage.Root maxWidth="md">
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                    <CreditCard className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Configurar Métodos de Pago</h2>
                    <p className="text-sm text-muted-foreground">
                      Activa y configura los métodos de pago que aceptas
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Guarda un método solo cuando sus datos estén completos. Los
                  campos obligatorios aparecerán en cada tarjeta al activarla.
                </div>

                <div className="space-y-4">
                  {METHOD_DEFINITIONS.map((definition) => (
                    <PaymentMethodCard
                      key={definition.id}
                      definition={definition}
                    />
                  ))}
                </div>
              </div>
            </MobilePage.Root>
          </MobileShell.Content>

          <MobileFixedFooter aboveNav>
            <MobilePage.Root maxWidth="md">
              <p className="mb-3 text-center text-xs text-muted-foreground">
                {!isDirty
                  ? "Sin cambios pendientes."
                  : !isValid
                    ? "Completa los campos obligatorios para guardar."
                    : "Tienes cambios pendientes por guardar."}
              </p>
              <Button
                type="submit"
                disabled={isPending || !isDirty || !isValid}
                className="h-14 w-full rounded-xl bg-orange-500 text-lg font-semibold hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </MobilePage.Root>
          </MobileFixedFooter>
        </MobileShell.Root>
      </form>
    </FormProvider>
  );
}

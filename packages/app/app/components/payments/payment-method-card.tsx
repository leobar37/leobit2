import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormInput } from "@/components/forms/form-input";
import { QRImageUpload } from "./qr-image-upload";
import type { PaymentMethodsFormData } from "~/lib/schemas/payment-methods";

interface MethodDefinition {
  id: keyof PaymentMethodsFormData;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

interface PaymentMethodCardProps {
  definition: MethodDefinition;
}

export function PaymentMethodCard({ definition }: PaymentMethodCardProps) {
  const {
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<PaymentMethodsFormData>();
  const enabled = useWatch({
    control,
    name: `${definition.id}.enabled` as const,
  });
  const [expanded, setExpanded] = useState(false);
  const methodError = errors[definition.id];

  const handleToggle = (checked: boolean) => {
    setValue(`${definition.id}.enabled` as const, checked, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setExpanded(checked && needsConfig);
    void trigger(definition.id);
  };

  const needsConfig = definition.id !== "efectivo" && definition.id !== "tarjeta";
  const isExpanded = expanded && enabled && needsConfig;
  const helperText = useMemo(() => {
    if (definition.id === "efectivo") {
      return "Siempre disponible para ventas al contado.";
    }

    if (definition.id === "tarjeta") {
      return "Actívalo si aceptas POS o cobros con tarjeta.";
    }

    if (definition.id === "transferencia") {
      return enabled
        ? "Completa los datos bancarios para que el cliente pueda transferirte."
        : "Úsalo para cobros bancarios con cuenta y CCI.";
    }

    return enabled
      ? "Completa al menos el celular para que este método quede listo."
      : "Ideal para cobros rápidos por billetera digital.";
  }, [definition.id, enabled]);

  return (
    <div
      className={cn(
        "shell-card-flat rounded-2xl border-2 p-4 transition-all",
        enabled
          ? "border-orange-200/60 bg-orange-500/[0.06] dark:border-orange-500/30 dark:bg-orange-500/10"
          : "border-border/60 bg-muted/30 dark:bg-muted/20",
        methodError && "border-destructive/60"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              enabled ? definition.bgColor : "bg-muted dark:bg-muted/60",
              enabled ? definition.color : "text-muted-foreground"
            )}
          >
            <definition.icon className={cn("h-5 w-5", enabled ? definition.color : "text-muted-foreground")} />
          </div>
          <div>
            <p className="font-medium">{definition.name}</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? "Activo" : "Desactivado"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {enabled && needsConfig && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {isExpanded ? (
                <>
                  Cerrar
                  <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Configurar
                  <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          )}
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            id={`payment-method-${definition.id}`}
          />
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{helperText}</p>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-orange-200/60 dark:border-orange-500/20 space-y-3">
          {(definition.id === "yape" || definition.id === "plin") && (
            <>
              <FormInput
                name={`${definition.id}.phone`}
                label="Número de celular"
                placeholder="999 999 999"
                helperText="Será el número que verá el cliente para pagar."
              />
              <FormInput
                name={`${definition.id}.accountName`}
                label="Nombre del titular"
                placeholder="Nombre completo"
              />
              <QRImageUpload
                name={`${definition.id}.qrImageUrl`}
                label="Código QR (opcional)"
              />
            </>
          )}

          {definition.id === "transferencia" && (
            <>
              <FormInput
                name={`${definition.id}.bank`}
                label="Banco"
                placeholder="Nombre del banco"
                helperText="Ejemplo: BCP, Interbank o BBVA."
              />
              <FormInput
                name={`${definition.id}.accountNumber`}
                label="Número de cuenta"
                placeholder="0000 0000 0000 0000"
              />
              <FormInput
                name={`${definition.id}.cci`}
                label="CCI (Código de Cuenta Interbancario)"
                placeholder="00200000000000000000"
                helperText="Opcional, pero recomendado para transferencias entre bancos."
              />
              <FormInput
                name={`${definition.id}.accountName`}
                label="Titular de la cuenta"
                placeholder="Nombre completo"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

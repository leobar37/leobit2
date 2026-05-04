import { QrCode, Phone, Building2, User } from "lucide-react";
import type { PaymentMethodsConfig } from "~/hooks/use-payment-methods-config";

interface PaymentMethodInfoProps {
  method: "yape" | "plin" | "transferencia";
  config: PaymentMethodsConfig | undefined;
}

export function PaymentMethodInfo({ method, config }: PaymentMethodInfoProps) {
  const methodConfig = config?.methods?.[method];

  if (!methodConfig) return null;

  return (
    <div className="shell-card-soft rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-foreground font-medium">
        <QrCode className="h-4 w-4 text-muted-foreground" />
        <span>Datos para el pago</span>
      </div>

      {methodConfig.qrImageUrl ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Escanea el código QR:</p>
          <div className="shell-field inline-block rounded-xl p-3">
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
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">
            Número: <strong>{methodConfig.phone}</strong>
          </span>
        </div>
      ) : null}

      {methodConfig.accountName ? (
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Titular: <strong className="text-foreground">{methodConfig.accountName}</strong>
          </span>
        </div>
      ) : null}

      {method === "transferencia" && (
        <>
          {methodConfig.bank ? (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Banco: <strong className="text-foreground">{methodConfig.bank}</strong>
              </span>
            </div>
          ) : null}
          {methodConfig.accountNumber ? (
            <p className="text-sm text-muted-foreground">
              Cuenta: <strong className="text-foreground">{methodConfig.accountNumber}</strong>
            </p>
          ) : null}
          {methodConfig.cci ? (
            <p className="text-sm text-muted-foreground">
              CCI: <strong className="text-foreground">{methodConfig.cci}</strong>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

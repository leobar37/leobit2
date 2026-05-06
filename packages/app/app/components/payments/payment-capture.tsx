import { useState, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import { usePaymentMethodsConfig } from "~/hooks/use-payment-methods-config";
import { PaymentSummary } from "./payment-summary";
import { PaymentMethodSelector } from "./payment-method-selector";
import { PaymentMethodInfo } from "./payment-method-info";
import { ProofCapture } from "./proof-capture";

export type PaymentMethod = "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta" | "saldo";

interface PaymentCaptureProps {
  variant?: "drawer" | "inline";
  disabled?: boolean;

  // Payment method
  paymentMethod: string | null;
  onPaymentMethodChange: (method: PaymentMethod) => void;

  // Reference number
  referenceNumber?: string;
  onReferenceNumberChange?: (ref: string) => void;

  // Proof image
  proofImageId?: string | null;
  onProofUpload?: (file: File) => void;
  onProofRemove?: () => void;
  isUploading?: boolean;
}

export function PaymentCapture({
  variant = "inline",
  disabled = false,
  paymentMethod,
  onPaymentMethodChange,
  referenceNumber = "",
  onReferenceNumberChange,
  proofImageId,
  onProofUpload,
  onProofRemove,
  isUploading = false,
}: PaymentCaptureProps) {
  const isDrawer = variant === "drawer";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: paymentConfig } = usePaymentMethodsConfig();

  const enabledMethods = useMemo(() => {
    const allMethods: PaymentMethod[] = [
      "efectivo",
      "yape",
      "plin",
      "transferencia",
      "tarjeta",
    ];
    const config = paymentConfig?.methods;
    if (!config) return allMethods;
    return allMethods.filter((m) => config[m]?.enabled !== false);
  }, [paymentConfig]);

  const currentMethod = (paymentMethod as PaymentMethod) || null;
  const showMethodInfo =
    currentMethod === "yape" ||
    currentMethod === "plin" ||
    currentMethod === "transferencia";

  const showProofAndReference = currentMethod && currentMethod !== "efectivo";

  const handleMethodChange = useCallback(
    (method: PaymentMethod) => {
      onPaymentMethodChange(method);
    },
    [onPaymentMethodChange]
  );

  const handleReferenceChange = useCallback(
    (value: string) => {
      onReferenceNumberChange?.(value);
    },
    [onReferenceNumberChange]
  );

  const handleProofUpload = useCallback(
    (file: File) => {
      onProofUpload?.(file);
    },
    [onProofUpload]
  );

  const handleProofRemove = useCallback(() => {
    onProofRemove?.();
  }, [onProofRemove]);

  const renderContent = () => (
    <>
      <div className="space-y-3">
        {isDrawer && (
          <Label className="text-base font-semibold">Selecciona un método</Label>
        )}
        <PaymentMethodSelector
          methods={enabledMethods}
          selectedMethod={currentMethod}
          onSelect={handleMethodChange}
          disabled={disabled || isUploading}
        />
      </div>

      {showMethodInfo && paymentConfig && (
        <PaymentMethodInfo
          method={currentMethod as "yape" | "plin" | "transferencia"}
          config={paymentConfig}
        />
      )}

      {showProofAndReference && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reference">Número de operación (opcional)</Label>
            <Input
              id="reference"
              placeholder="Ej: 123456"
              value={referenceNumber}
              onChange={(e) => handleReferenceChange(e.target.value)}
              disabled={disabled || isUploading}
              className={cn(
                "shell-field h-12 rounded-2xl",
                (disabled || isUploading) && "opacity-50"
              )}
            />
          </div>

          <ProofCapture
            proofImageId={proofImageId ?? null}
            onUpload={handleProofUpload}
            onRemove={handleProofRemove}
            isUploading={isUploading}
          />
        </div>
      )}
    </>
  );

  // Inline mode: render directly
  if (!isDrawer) {
    return <div className="space-y-4">{renderContent()}</div>;
  }

  // Drawer mode: summary + drawer
  return (
    <>
      <PaymentSummary
        method={currentMethod}
        hasProof={!!proofImageId}
        onClick={() => setDrawerOpen(true)}
      />

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] bg-background flex flex-col">
          <DrawerHeader className="flex items-center justify-between border-b pb-4">
            <DrawerTitle className="text-lg font-semibold">
              Método de pago
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(false)}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {renderContent()}
          </div>

          <div className="border-t p-4">
            <Button
              onClick={() => setDrawerOpen(false)}
              className="w-full h-12 rounded-xl bg-orange-500 text-base font-semibold hover:bg-orange-600"
            >
              Cerrar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

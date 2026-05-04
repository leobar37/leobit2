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
import {
  usePaymentCapture,
  useUpdatePaymentCapture,
  useUploadPaymentProof,
  type PaymentMethod,
} from "~/hooks/use-payment-capture";
import { usePaymentMethodsConfig } from "~/hooks/use-payment-methods-config";
import { useUploadFile } from "~/hooks/use-files";
import { PaymentSummary } from "./payment-summary";
import { PaymentMethodSelector } from "./payment-method-selector";
import { PaymentMethodInfo } from "./payment-method-info";
import { ProofCapture } from "./proof-capture";

interface PaymentCaptureProps {
  variant?: "drawer" | "inline";
  // Drawer mode (ventas): paymentId required, uses TanStack Query
  paymentId?: string;
  // Inline mode (cobros): controlled props, no server calls
  paymentMethod?: string | null;
  onPaymentMethodChange?: (method: PaymentMethod) => void;
  referenceNumber?: string;
  onReferenceNumberChange?: (ref: string) => void;
  proofImageId?: string | null;
  onProofImageChange?: (id: string | null) => void;
  onProofUpload?: (file: File) => void;
  isUploading?: boolean;
}

export function PaymentCapture({
  variant = "drawer",
  paymentId,
  paymentMethod: controlledMethod,
  onPaymentMethodChange,
  referenceNumber: controlledReference,
  onReferenceNumberChange,
  proofImageId: controlledProofImageId,
  onProofImageChange,
  onProofUpload,
  isUploading: controlledIsUploading,
}: PaymentCaptureProps) {
  const isDrawer = variant === "drawer";

  // Drawer mode: use TanStack Query
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: payment, isLoading: isPaymentLoading } = usePaymentCapture(
    isDrawer ? paymentId ?? null : null
  );
  const { data: paymentConfig } = usePaymentMethodsConfig();
  const updatePayment = useUpdatePaymentCapture();
  const uploadProof = useUploadPaymentProof();
  const uploadFile = useUploadFile();

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

  // Determine current values based on mode
  const currentMethod = isDrawer
    ? ((payment?.paymentMethod as PaymentMethod) || null)
    : (controlledMethod as PaymentMethod) || null;
  const currentReference = isDrawer
    ? payment?.referenceNumber || ""
    : controlledReference || "";
  const currentProofImageId = isDrawer
    ? payment?.proofImageId || null
    : controlledProofImageId || null;

  const showMethodInfo =
    currentMethod === "yape" ||
    currentMethod === "plin" ||
    currentMethod === "transferencia";

  const showProofAndReference = currentMethod && currentMethod !== "efectivo";

  // Handlers
  const handleMethodChange = useCallback(
    async (method: PaymentMethod) => {
      if (isDrawer) {
        if (!paymentId || method === currentMethod) return;
        await updatePayment.mutateAsync({
          id: paymentId,
          input: { paymentMethod: method },
        });
      } else {
        onPaymentMethodChange?.(method);
      }
    },
    [isDrawer, paymentId, currentMethod, updatePayment, onPaymentMethodChange]
  );

  const handleReferenceChange = useCallback(
    async (value: string) => {
      if (isDrawer) {
        if (!paymentId) return;
        await updatePayment.mutateAsync({
          id: paymentId,
          input: { referenceNumber: value },
        });
      } else {
        onReferenceNumberChange?.(value);
      }
    },
    [isDrawer, paymentId, updatePayment, onReferenceNumberChange]
  );

  const handleProofUpload = useCallback(
    async (file: File) => {
      if (isDrawer) {
        if (!paymentId) return;
        await uploadProof.mutateAsync({ paymentId, file });
      } else if (onProofUpload) {
        onProofUpload(file);
      } else {
        // Inline mode without external handler: upload file directly
        const result = await uploadFile.mutateAsync(file);
        onProofImageChange?.(result.id);
      }
    },
    [isDrawer, paymentId, uploadProof, onProofUpload, uploadFile, onProofImageChange]
  );

  const handleProofRemove = useCallback(async () => {
    if (isDrawer) {
      if (!paymentId) return;
      await updatePayment.mutateAsync({
        id: paymentId,
        input: { proofImageId: "" },
      });
    } else {
      onProofImageChange?.(null);
    }
  }, [isDrawer, paymentId, updatePayment, onProofImageChange]);

  const isMutating = isDrawer
    ? updatePayment.isPending || uploadProof.isPending
    : uploadFile.isPending;
  const isUploading = isDrawer ? uploadProof.isPending : (controlledIsUploading || uploadFile.isPending);

  // Inline content (shared between modes)
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
          disabled={isMutating}
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
              value={currentReference}
              onChange={(e) => handleReferenceChange(e.target.value)}
              disabled={isMutating}
              className={cn(
                "shell-field h-12 rounded-2xl",
                isMutating && "opacity-50"
              )}
            />
          </div>

          <ProofCapture
            proofImageId={currentProofImageId}
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
        hasProof={!!currentProofImageId}
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
            {isPaymentLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
              </div>
            ) : (
              renderContent()
            )}
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

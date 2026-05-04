# T-003: PaymentCaptureDrawer UI

## Objective
Create the fullscreen drawer with all payment UI components.

## Files to Create

### 1. `components/payments/payment-capture-drawer.tsx`

```typescript
interface PaymentCaptureDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Abono | null;
  paymentConfig?: PaymentMethodsConfig;
  enabledMethods?: string[];
  requireProofForWallets?: boolean;
}

export function PaymentCaptureDrawer({
  open, onOpenChange, payment, paymentConfig, enabledMethods, requireProofForWallets
}: PaymentCaptureDrawerProps) {
  const updatePayment = useUpdatePayment();
  const uploadFile = useUploadFile();

  const handleMethodChange = (method: string) => {
    if (!payment?.id) return;
    updatePayment.mutate({ id: payment.id, input: { paymentMethod: method } });
  };

  const handleReferenceChange = (referenceNumber: string) => {
    if (!payment?.id) return;
    updatePayment.mutate({ id: payment.id, input: { referenceNumber } });
  };

  const handleProofImage = async (file: File) => {
    if (!payment?.id) return;
    const uploaded = await uploadFile.mutateAsync(file);
    updatePayment.mutate({ id: payment.id, input: { proofImageId: uploaded.id } });
  };

  const handleRemoveProof = () => {
    if (!payment?.id) return;
    updatePayment.mutate({ id: payment.id, input: { proofImageId: null } });
  };

  const method = payment?.paymentMethod || "efectivo";
  const showDetails = method !== "efectivo";
  const needsProof = requireProofForWallets && ["yape", "plin"].includes(method);
  const hasProof = !!payment?.proofImageId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <span className="font-semibold">Pago</span>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <PaymentMethodSelector
            value={method}
            onChange={handleMethodChange}
            enabledMethods={enabledMethods}
          />

          {showDetails && (
            <>
              {paymentConfig && (
                <PaymentMethodInfo
                  method={method}
                  config={paymentConfig}
                />
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Número de operación (opcional)
                </label>
                <Input
                  value={payment?.referenceNumber || ""}
                  onChange={(e) => handleReferenceChange(e.target.value)}
                  placeholder="Ej: 123456"
                  className="shell-field h-12 rounded-[16px]"
                />
              </div>

              <ProofCapture
                imageId={payment?.proofImageId}
                onImageSelected={handleProofImage}
                onRemove={handleRemoveProof}
                required={needsProof}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 2. `components/payments/payment-method-selector.tsx`

Grid of payment method buttons. 2 columns on mobile.

### 3. `components/payments/payment-method-info.tsx`

Display QR code, phone number, bank details from payment config.

### 4. `components/payments/proof-capture.tsx`

Proof image capture with CameraGalleryDrawer integration. Shows preview when image exists.

### 5. `components/payments/payment-summary.tsx`

Compact display of payment method and proof status for the button.

## Acceptance Criteria
- [ ] Drawer opens fullscreen on mobile (`h-[100dvh]`)
- [ ] Method selector is a 2-column grid of buttons
- [ ] Reference input only shows for non-cash methods
- [ ] Proof capture shows CameraGalleryDrawer on mobile
- [ ] Each change mutates the server immediately
- [ ] No "Guardar" button in drawer, only "Cerrar"

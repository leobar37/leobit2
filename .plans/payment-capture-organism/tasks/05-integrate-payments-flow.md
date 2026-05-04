# T-005: Integrate into Payments Flow (Cobros)

## Objective
Replace the manual payment block in `cobros.nuevo.tsx` with `FormPaymentCapture`.

## Changes

### `routes/_protected.cobros.nuevo.tsx`

```typescript
function NuevoCobroPage() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("clienteId");
  const saleId = searchParams.get("saleId") || undefined;

  const wrapperForm = useWrapperForm({
    defaultValues: {
      amount: "",
      notes: "",
      paymentId: undefined,  // NEW
    },
    // No field resolver needed - PaymentCapture manages itself
  });

  const onSubmit = async (data: FormData) => {
    if (!customerId || !data.paymentId) return;

    // Confirm the draft payment
    const response = await api.payments({ id: data.paymentId }).confirm.post({
      amount: parseFloat(data.amount),
      notes: data.notes,
    });

    toast.success("Pago registrado correctamente");
  };

  return (
    <WrapperFormProvider form={wrapperForm}>
      <form onSubmit={wrapperForm.handleSubmit(onSubmit)}>
        <FormInput name="amount" label="Monto" />
        <FormInput name="notes" label="Notas" />

        {/* NEW: Just this */}
        <FormPaymentCapture
          name="paymentId"
          label="Método de pago"
          paymentConfig={config}
          requireProofForWallets
        />

        <button type="submit">Confirmar pago</button>
      </form>
    </WrapperFormProvider>
  );
}
```

## Acceptance Criteria
- [ ] Cobros flow uses FormPaymentCapture
- [ ] Draft payment is created when drawer opens
- [ ] Payment is confirmed on form submit
- [ ] Amount and notes are separate from payment details

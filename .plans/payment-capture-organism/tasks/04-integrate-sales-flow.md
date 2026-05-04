# T-004: Integrate into Sales Flow

## Objective
Replace the manual payment block in `payment-mode-section.tsx` with `FormPaymentCapture`.

## Changes

### 1. `components/sales/new-sale-context.tsx`

Add `paymentId` to context:

```typescript
interface NewSaleContextType {
  saleId: string | null;
  paymentId: string | null;  // NEW
  // ... rest unchanged
}

// In provider:
const [paymentId, setPaymentId] = useState<string | null>(null);
```

### 2. `components/sales/new-sale/payment-mode-section.tsx`

Replace the payment details block:

```typescript
// BEFORE: Manual payment method, reference, proofImageId state
// AFTER: Just FormPaymentCapture

{showPaymentDetails && (
  <FormPaymentCapture
    name="paymentId"
    label="Método de pago"
    paymentConfig={config}
    requireProofForWallets
  />
)}
```

### 3. `components/sales/new-sale/sale-submit-bar.tsx`

Read paymentId from context:

```typescript
const { saleId, paymentId, sale, items } = useNewSaleContext();

// In finalizeSale:
await finalizeSale.mutateAsync({
  id: saleId,
  paymentMode: sale?.paymentMode,
  paymentId: paymentId || undefined,  // Pass paymentId to backend
});
```

## Acceptance Criteria
- [ ] Sales flow uses FormPaymentCapture
- [ ] Payment details are saved incrementally
- [ ] Finalize sale passes paymentId to backend
- [ ] Existing sales without paymentId still work

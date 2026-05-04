# T-006: Tests and Cleanup

## Objective
Add tests for the payment capture organism and clean up legacy code.

## Tests

### Unit Tests

```typescript
// components/payments/__tests__/form-payment-capture.test.tsx
describe("FormPaymentCapture", () => {
  it("creates draft payment when opened without ID", async () => {
    // ...
  });

  it("opens drawer with existing payment ID", async () => {
    // ...
  });

  it("stores paymentId in RHF field", async () => {
    // ...
  });
});

// components/payments/__tests__/payment-capture-drawer.test.tsx
describe("PaymentCaptureDrawer", () => {
  it("mutates method change immediately", async () => {
    // ...
  });

  it("shows proof capture for yape/plin", () => {
    // ...
  });

  it("hides details for efectivo", () => {
    // ...
  });
});
```

### E2E Tests

```typescript
// e2e/tests/payment-capture.spec.ts
test("user can capture payment with Yape and proof", async () => {
  // ...
});
```

## Cleanup

- [ ] Remove legacy `paymentMethod`, `referenceNumber`, `proofImageId` from `NewSaleContext`
- [ ] Remove manual payment blocks from `payment-mode-section.tsx`
- [ ] Remove manual payment blocks from `cobros.nuevo.tsx`
- [ ] Update documentation

## Acceptance Criteria
- [ ] All tests pass
- [ ] Mobile UX verified (camera, gallery)
- [ ] Legacy code removed
- [ ] No regressions in sales or payments flow

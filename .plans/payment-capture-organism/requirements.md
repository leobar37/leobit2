# PaymentCapture Organism - Requirements

## Overview
Create a standalone, reusable payment capture organism that handles the entire payment flow (method selection, reference number, proof image) as an independent entity. It integrates cleanly with react-hook-form as a single field (just a name), while managing all payment state via TanStack Query.

## Functional Requirements

### FR-001: Standalone Payment Organism
The payment capture must be a self-contained organism that does not depend on form state for its internal data. All payment data lives on the server.

### FR-002: RHF Integration via useController
The component integrates with react-hook-form via `useController`, exposing only a `name` prop. The form stores only `paymentId: string`.

### FR-003: Mobile Camera/Gallery Capture
On mobile devices, the proof image capture must open a bottom sheet allowing the user to either take a photo with the camera or select from the gallery.

### FR-004: Payment Method Selection
Support payment methods: `efectivo`, `yape`, `plin`, `transferencia`, `tarjeta`. Methods are displayed as a grid of selectable buttons.

### FR-005: Proof Image Upload
When a proof image is captured (camera or gallery), it must be uploaded to the server and associated with the payment record immediately.

### FR-006: Reference Number Input
For non-cash payment methods, provide an input field for the operation reference number (e.g., Yape/Plin transaction number).

### FR-007: Payment Config Display
When payment config (QR image, phone number, bank details) is available, display it to the user inside the drawer.

### FR-008: Draft Payment Creation
If no payment ID exists when the component opens, it must automatically create a draft payment on the server.

### FR-009: Immediate Server Mutations
Every change in the drawer (method, reference, proof image) must be saved to the server immediately. No local draft state.

### FR-010: Clean Form Integration
The form using this component should only declare `<FormPaymentCapture name="paymentId" />`. No additional props, no schema changes.

### FR-011: Reusable Across Flows
The same component must work in sales (ventas), payments (cobros), and purchases (compras) without modification.

### FR-012: AI-Ready Metadata Fields
The payment entity must have extensible metadata fields for future AI extraction (amount, date, phone, confidence, rawText).

## Non-Functional Requirements

### NFR-001: No Local Draft State
The component must not maintain local state for payment details. All state comes from `usePayment(paymentId)` and mutations go directly to the server.

### NFR-002: TanStack Query for Payment State
Payment data must be fetched and cached via TanStack Query (`usePayment`, `useUpdatePayment`, `useCreatePaymentDraft`).

### NFR-003: No Form Schema Changes
Adding this component to a form must not require changes to Zod schemas or form defaultValues beyond adding `paymentId?: string`.

### NFR-004: Mobile-First UX
The drawer must occupy the full viewport height on mobile (`h-[100dvh]`). The method selector must be thumb-friendly.

### NFR-005: Incremental Migration
Existing payment flows (sales, cobros) must be migratable one at a time. The old code can coexist during migration.

## API Contract

### FormPaymentCapture Props
```typescript
interface FormPaymentCaptureProps {
  name: string;                    // Field name in RHF (stores paymentId)
  label?: string;                  // Label text
  paymentConfig?: PaymentMethodsConfig;  // Business payment config (QR, phone, etc.)
  enabledMethods?: string[];       // Filter available methods
  requireProofForWallets?: boolean; // Require proof for yape/plin
}
```

### Payment Entity (Backend)
```typescript
interface Payment {
  id: string;
  status: "draft" | "confirmed" | "cancelled";
  paymentMethod?: string;
  referenceNumber?: string;
  proofImageId?: string;
  amount?: string;
  customerId?: string;
  relatedSaleId?: string;
  createdAt: string;
  updatedAt: string;
  // AI-ready metadata (future)
  metadata?: {
    extractedAmount?: string;
    extractedDate?: string;
    extractedPhone?: string;
    confidence?: number;
    rawText?: string;
  };
}
```

### Hooks
```typescript
// Create a draft payment
function useCreatePaymentDraft(): UseMutationResult<Payment, Error, CreateDraftInput>;

// Get payment by ID
function usePayment(id: string | null): UseQueryResult<Payment | null>;

// Update payment (method, reference, proofImageId)
function useUpdatePayment(): UseMutationResult<Payment, Error, UpdatePaymentInput>;
```

## UX Flow

1. Form renders `<FormPaymentCapture name="paymentId" />`
2. User sees summary button: "Seleccionar método de pago" (or current method if set)
3. User taps button → drawer opens fullscreen
4. If no paymentId exists, draft payment is created automatically
5. User selects method → saved immediately
6. If method is not "efectivo", reference input and proof capture appear
7. User enters reference → saved immediately on blur
8. User taps proof capture → CameraGalleryDrawer opens
9. User takes photo or selects from gallery → uploaded immediately, payment updated
10. User taps "Cerrar" → drawer closes, form has paymentId

## Files to Create

| File | Description |
|------|-------------|
| `components/payments/form-payment-capture.tsx` | RHF field wrapper |
| `components/payments/payment-capture.tsx` | Core organism (no RHF) |
| `components/payments/payment-capture-drawer.tsx` | Fullscreen drawer |
| `components/payments/payment-method-selector.tsx` | Method grid |
| `components/payments/payment-method-info.tsx` | Config display (QR, phone) |
| `components/payments/proof-capture.tsx` | Proof image capture + preview |
| `components/payments/payment-summary.tsx` | Compact summary for button |
| `hooks/use-payments.ts` | Add useCreatePaymentDraft |

## Files to Modify

| File | Change |
|------|--------|
| `backend: payments table` | Add `status` enum column |
| `backend: POST /payments` | Support creating draft payments |
| `components/sales/new-sale/payment-mode-section.tsx` | Use FormPaymentCapture |
| `routes/_protected.cobros.nuevo.tsx` | Use FormPaymentCapture |

# PaymentCapture Organism - Task Index

## Summary

- Mode: Structured
- Slug: `payment-capture-organism`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` standalone payment organism | T-001, T-002, T-003 |
| `FR-002` RHF integration via useController | T-002 |
| `FR-003` mobile camera/gallery capture | T-003 |
| `FR-004` payment method selection | T-003 |
| `FR-005` proof image upload | T-003 |
| `FR-006` reference number input | T-003 |
| `FR-007` payment config display (QR, phone) | T-003 |
| `FR-008` draft payment creation | T-001 |
| `FR-009` immediate server mutations | T-002, T-003 |
| `FR-010` clean form integration (just a name) | T-002 |
| `FR-011` reusable across sales, payments, purchases | T-002, T-004, T-005 |
| `FR-012` AI-ready metadata fields | T-001 |
| `NFR-001` no local draft state | T-002, T-003 |
| `NFR-002` TanStack Query for payment state | T-002 |
| `NFR-003` no form schema changes | T-002 |
| `NFR-004` mobile-first UX | T-003 |
| `NFR-005` incremental migration | T-004, T-005 |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-backend-payment-draft.md` | Add `status` and `draft` support to payments table + create draft endpoint | none |
| `T-002` | `tasks/02-create-form-payment-capture.md` | Create `FormPaymentCapture` RHF field component + `usePaymentDraft` hook | T-001 |
| `T-003` | `tasks/03-create-payment-capture-drawer.md` | Create `PaymentCaptureDrawer` with method selector, proof capture, reference input | T-002 |
| `T-004` | `tasks/04-integrate-sales-flow.md` | Integrate `FormPaymentCapture` into sales payment flow | T-002, T-003 |
| `T-005` | `tasks/05-integrate-payments-flow.md` | Integrate `FormPaymentCapture` into cobros (payments) flow | T-002, T-003 |
| `T-006` | `tasks/06-tests-and-cleanup.md` | Add tests, verify mobile UX, cleanup legacy payment code | T-004, T-005 |

## Suggested Execution Order

1. `T-001` - Backend: add draft status to payments
2. `T-002` - Frontend: create FormPaymentCapture hook/component
3. `T-003` - Frontend: create PaymentCaptureDrawer UI
4. `T-004` - Integrate into sales flow (ventas)
5. `T-005` - Integrate into payments flow (cobros)
6. `T-006` - Tests, cleanup, verification

## Notes

- The organism does NOT use field resolvers. It manages its own server state via TanStack Query.
- The form only stores `paymentId: string`. All payment details live on the server.
- Each change in the drawer mutates the payment immediately. No "Save" button in drawer.

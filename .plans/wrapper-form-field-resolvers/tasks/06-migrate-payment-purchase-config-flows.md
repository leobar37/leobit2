# T-006 - Migrate Payment, Purchase, Config, and Asset Flows

## Objective

Migrate workflow-heavy and currently duplicated file/asset upload flows to the wrapper resolver mechanism after product/profile flows validate the API.

## Requirements Covered

- `FR-014`
- `FR-015`
- `NFR-005`
- `NFR-006`

## Dependencies

- T-002
- T-003
- T-004

## Files or Areas Involved

- `packages/app/app/routes/_protected.cobros.nuevo.tsx` - Modify - remove manual proof image state/upload/update flow where possible
- `packages/app/app/hooks/use-payments.ts` - Modify if needed - ensure create/update accepts resolved IDs cleanly
- `packages/backend/src/api/payments.ts` - Review - keep existing ID update endpoint; consider whether direct upload proof endpoint remains for backward compatibility
- `packages/app/app/components/purchases/purchase-form-context.tsx` - Modify - use wrapper resolver for `receiptImageId`
- `packages/app/app/routes/_protected.compras.nueva.($draftId)._index.tsx` - Modify - use `FormMediaField` for receipt upload
- `packages/app/app/routes/_protected.config.payment-methods.tsx` - Modify - centralize QR file upload flow or document URL-storage limitation
- `packages/app/app/routes/_protected.activos.tsx` - Modify - replace `useFileUpload` stub path with real resolver/upload flow
- `packages/app/app/hooks/use-file-upload.ts` - Delete or turn into compatibility wrapper after migration
- `packages/app/app/hooks/use-files.ts` - Simplify or wrap new media client
- `packages/app/app/hooks/use-assets.ts` - Simplify or wrap new media client
- `packages/backend/src/api/businesses.ts` - Review - decide whether logo upload stays special-case in this phase

## Actions

1. Migrate payment proof field to `proofImageId: fileField()`.
2. Prefer submitting `proofImageId` in the initial payment payload when possible instead of create-then-upload-then-update.
3. Migrate purchase receipt field to `receiptImageId: fileField()` while preserving current purchase API expectations.
4. Replace `_protected.activos.tsx` usage of the stubbed `useFileUpload` with real asset/file resolver behavior.
5. Centralize QR upload logic through the new upload client; if config still stores URLs, document that this flow uses upload result URL rather than ID until schema/config changes.
6. Review business logo upload. Keep direct endpoint if schema remains `logoUrl`, but avoid duplicating validation/upload utility logic where practical.
7. Remove duplicated local validation helpers only after equivalent behavior exists in the new resolver/client.
8. Preserve existing endpoint compatibility unless a route is proven unused.

## Completion Criteria

- Payment proof selection no longer has feature-specific upload orchestration in the route.
- Purchase receipt upload no longer uses standalone manual resolver logic.
- `_protected.activos.tsx` no longer depends on the stubbed `useFileUpload` behavior.
- QR/logo flows either use centralized upload primitives or are explicitly documented as schema-bound exceptions.
- Backend still receives IDs for ID fields and URLs only for existing URL fields.

## Validation

- `cd packages/app && bun run typecheck`
- Manual payment proof upload and submit.
- Manual purchase receipt upload and submit.
- Manual QR upload in payment method config.
- Manual active asset upload flow.

## Risks or Notes

- Payment create currently creates the payment before uploading proof; changing order may affect offline behavior. Keep online-only assumption explicit.
- QR config may currently store URL strings. Do not force an ID payload unless the underlying config model changes.
- Business logo uses `logoUrl`; avoid broad schema migration in this plan unless explicitly requested later.

# T-001: Fix Local Sale Schema for Pre_Order Fields

## Requirement

`FR-001` — Local Zod schema must validate and parse pre_order rows from PGlite without failures, including `type`, `deliveryDate`, `orderDate`, and extended status values (`confirmed`, `delivered`).

## Context

The `saleSchema` in `packages/app/app/lib/db/schema.ts` (lines 67-97) is missing all pre_order-specific fields. PGlite correctly stores pre_order rows (verified in `sale-service.ts:510`), but the Zod schema silently drops or fails validation on these fields when rows are read back.

The schema also has a `clientId` field (line 69) which appears to be a renamed `customerId` — this should be verified and is noted as an open question.

## Affected Files

- `packages/app/app/lib/db/schema.ts` — Modify `saleSchema` (lines 67-97)
- `packages/app/app/lib/db/schema.ts` — Verify `Sale` type export still works after changes

## Changes Required

### 1. Add `type` field to `saleSchema`

Add `type` as the second field (after `id`), mirroring the DB schema:

```typescript
type: z.enum(["instant_sale", "pre_order"]).default("instant_sale"),
```

### 2. Add `deliveryDate` and `orderDate` fields to `saleSchema`

Both are date strings stored as `YYYY-MM-DD`. Use nullable string to match the DB column behavior:

```typescript
deliveryDate: z.string().nullable().optional(),
orderDate: z.string().nullable().optional(),
```

Place after `netWeight` (line 77), before `syncStatus`.

### 3. Expand `status` enum

Current status enum (line 79):
```typescript
status: z.enum(["draft", "active", "cancelled"]).default("draft"),
```

Update to include pre_order statuses:
```typescript
status: z.enum(["draft", "active", "confirmed", "delivered", "cancelled"]).default("draft"),
```

## Verification

1. Run `bun run typecheck` — no new TypeScript errors
2. Create a pre_order locally, inspect that `saleSchema.parse()` does not throw
3. Verify `Sale` type (inferred from schema) includes `type`, `deliveryDate`, `orderDate`

## Dependencies

None — this is a foundation task with no prerequisites.

## Risks

- **Risk**: Adding `type` as the second field shifts positional inference for `Sale` type — verify all consumers of `Sale` type in the app still compile
- **Risk**: `clientId` (line 69) vs `customerId` naming inconsistency — this predates the fix and should not be changed as part of this task

## Open Questions

- **Open**: Is `clientId` in the local schema intentionally different from `customerId` in the backend? The DB column is `customer_id`. This is pre-existing and out of scope for this task.

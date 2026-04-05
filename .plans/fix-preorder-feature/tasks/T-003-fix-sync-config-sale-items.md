# T-003: Add sale_items to SYNC_STATUS_TRACKED

## Requirement

`FR-003` — `sale_items` rows must have their `sync_status` updated to `"synced"` after a successful sync operation.

## Context

`packages/shared/src/sync-config.ts` defines `SYNC_STATUS_TRACKED` — the list of entity tables whose `sync_status` column should be updated to `"synced"` after a sync operation completes. Currently it includes `"sales"` but not `"sale_items"`.

When `sync-service.ts` processes a completed sync operation, it updates `sync_status` only for entities in this list. For sale_items, the update is skipped silently.

## Affected Files

- `packages/shared/src/sync-config.ts` — Add `"sale_items"` to `SYNC_STATUS_TRACKED`

## Changes Required

In `packages/shared/src/sync-config.ts` (lines 54-63), add `"sale_items"`:

```typescript
export const SYNC_STATUS_TRACKED = [
  "sales",
  "sale_items",   // ADD THIS
  "customers",
  "customer_groups",
  "customer_group_members",
  "visitas",
  "abonos",
  "purchases",
] as const;
```

Note: The entity string `"sale_items"` must match exactly what `validateEntityTableName()` in `sync-service.ts` uses as the entity type in `sync_operations`.

## Verification

1. Create a sale with items offline
2. Trigger sync
3. Query the database: `SELECT id, sync_status FROM sale_items WHERE sale_id = '<sale_id>'`
4. Verify all items show `sync_status = 'synced'`

## Dependencies

None — isolated shared config change.

## Risks

- **Risk**: Low. This is a one-line addition to a whitelist. Existing behavior for other entities is unchanged.
- **Risk**: Verify that `"sale_items"` is the correct entity string used in `sync_operations.entity_type`. If it differs (e.g., `"sale_item"` singular), this task will silently not work. Check `sync-service.ts` `validateEntityTableName()` function to confirm.

## Open Questions

- **Open**: Is the entity type string definitely `"sale_items"` (plural) or `"sale_item"` (singular)? Verify before implementing.

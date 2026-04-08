# T-001 Wire TanStack Query Invalidation on Pull

## Objective

Connect `pullService.setOnChangesApplied()` to `queryClient.invalidateQueries()` so that after server-pull delivers changes, affected TanStack Query caches are invalidated and the UI reflects new data immediately.

## Requirements Covered

- `FR-002`

## Dependencies

- None (this is the first task — the infrastructure for passing queryClient into sync layer does not exist yet)

## Files or Areas Involved

- `packages/app/app/lib/sync/service-provider.tsx` - Modify - Wire the callback in the sync state provider
- `packages/app/app/lib/sync/pull-service.ts` - Review - Confirm `setOnChangesApplied` API
- `packages/app/app/lib/sync/sync-events.ts` - Review - Confirm `pull:completed` event already emits
- `packages/app/app/hooks/use-sales.ts` - Review - Current query keys for sales
- `packages/app/app/hooks/use-customers.ts` - Review - Current query keys for customers

## Actions

1. **Audit all TanStack Query keys used by entity services.** Run `grep -r "queryKey" packages/app/app/hooks/` and `grep -r "useQuery" packages/app/app/hooks/`. Collect a map of `entityType → queryKey pattern`. Known entities: sales, customers, products, visitas, abonos, purchases, distribuciones.

2. **Create a query key registry or constants file** at `packages/app/app/lib/sync/query-keys.ts` that exports a `SYNC_TO_QUERY_KEYS` map: `Record<EntityType, string[][]>`. This maps each sync entity type to the list of TanStack Query key arrays that should be invalidated. Example:
   ```typescript
   export const SYNC_TO_QUERY_KEYS: Record<string, string[][]> = {
     sales: [["sales-new"], ["sales-new", "filtered"], ["sales-new", "page"]],
     customers: [["customers-new"], ["customers-new", "list"]],
     // ...
   };
   ```
   This avoids importing hooks into the sync layer.

3. **Wire `setOnChangesApplied` in `ServicesProvider`** (`service-provider.tsx`). The sync services are created in `useMemo`, but `queryClient` is a React context value. Find or create a place where both `pullService` ref and `queryClient` are accessible. The recommended approach:
   - In `SyncStateProvider` (which wraps children and already has access to `useQueryClient()`), add a `useEffect` that calls `pullService.setOnChangesApplied(...)`.
   - Get `pullService` from `ServicesContext` (it's already there as `context.pullService`).
   - Use the `SYNC_TO_QUERY_KEYS` map to call `queryClient.invalidateQueries({ queryKey: [...] })` per entity type.

4. **Verify `SyncStateProvider` has `useQueryClient()` available.** Check if `SyncStateProvider` already imports from `@tanstack/react-query`. If not, add the import and use `const queryClient = useQueryClient()` inside the component.

5. **Test the flow manually**:
   - Open two browser tabs logged into the same business
   - In Tab A, modify a sale (add item, change status)
   - In Tab B, wait for auto-pull (10s) or trigger manual pull
   - Verify Tab B immediately reflects the change without page reload

## Completion Criteria

- `setOnChangesApplied` is called exactly once during sync service initialization
- After a pull with changes, `queryClient.invalidateQueries()` is called with the correct keys for each affected entity type
- No new TanStack Query keys are introduced — only existing keys are invalidated
- No circular imports (sync layer must not import hooks)

## Validation

- Manual test with two tabs (described in step 5)
- Unit test: mock `queryClient`, simulate pull with `customers` changes, assert `invalidateQueries` was called with `["customers-new"]`

## Risks or Notes

- **Risk**: If `pullService` ref changes on re-render, the callback must be re-registered. Use `useEffect` with `[pullService]` deps to ensure stale callbacks are cleaned up.
- **Note**: The existing `pull:completed` event in `sync-events.ts` is already emitted but only updates `lastPullTime`. The `onChangesApplied` callback approach is more targeted (per-entity-type) than a full `pull:completed` invalidation.

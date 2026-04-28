# T-007 Cleanup Base Classes and Transition Infrastructure

## Objective

Delete the custom base classes (`StatefulSyncHandler`, backend `BaseSyncHandler`), transition infrastructure for sale/distribucion, and the `core/` utility directory after all three custom handlers have been migrated to `SyncHandlerBuilder`.

## Requirements Covered

- `FR-008` (delete `StatefulSyncHandler`)
- `FR-009` (delete backend `BaseSyncHandler`)
- `FR-010` (remove `setupSaleTransitions`)
- `FR-011` (remove `setupDistribucionTransitions`)
- `FR-013` (remove `saleMachine`, `distribucionMachine`)

## Dependencies

- `T-003` (sales handler migrated — no longer uses `StatefulSyncHandler`)
- `T-004` (distribucion handler migrated)
- `T-005` (purchase handler migrated — no longer uses state machine)

## Files or Areas Involved

- `packages/backend/src/services/sync-handlers/core/StatefulSyncHandler.ts` - Delete
- `packages/backend/src/services/sync-handlers/core/patch-utils.ts` - Delete (if no remaining consumers)
- `packages/backend/src/services/sync-handlers/core/` - Delete directory (if empty after above)
- `packages/backend/src/services/sync-handlers/BaseSyncHandler.ts` - Delete
- `packages/backend/src/services/transitions/sale.ts` - Delete
- `packages/backend/src/services/transitions/distribucion.ts` - Delete
- `packages/backend/src/services/transitions/index.ts` - Modify: remove sale/distribucion/purchase machines, keep only staffInvitation
- `packages/backend/src/services/transitions/AGENTS.md` - Modify: update documentation
- `packages/backend/src/lib/state-machine.ts` - Review: if only `staffInvitationMachine` uses it, consider simplifying
- `packages/backend/src/services/business/sale.service.ts` - Review: check if it references `saleMachine` or `StateMachineRegistry`
- `packages/backend/src/services/business/distribucion.service.ts` - Review: check for state machine references

## Actions

1. Delete `core/StatefulSyncHandler.ts`
2. Verify `core/patch-utils.ts` has no remaining consumers (should be unused after T-003). Delete if unused.
3. Delete `core/` directory if empty
4. Delete `BaseSyncHandler.ts`
5. Delete `transitions/sale.ts`
6. Delete `transitions/distribucion.ts`
7. Update `transitions/index.ts`:
   - Remove `saleMachine` definition and export
   - Remove `distribucionMachine` definition and export
   - Remove `PurchaseState` type (moved or inlined in T-005)
   - Remove `DistribucionState` type
   - Remove `SaleState` type
   - Remove `DistribucionWithItems` interface
   - Remove `SaleWithItems` interface (if not used elsewhere)
   - Remove `setupSaleTransitions` import and call from `initializeStateMachines`
   - Remove `setupDistribucionTransitions` import and call
   - Remove `StateMachineRegistry.register("sale", ...)` and `StateMachineRegistry.register("distribucion", ...)`
   - Keep `staffInvitationMachine` and `setupStaffInvitationTransitions`
   - Simplify `StateMachineDependencies` interface (remove `saleDeps`)
8. Search for any remaining imports of deleted files and remove them
9. Search for any references to `StateMachineRegistry.get("sale")` or `StateMachineRegistry.get("distribucion")` and remove
10. Update `AGENTS.md` files to reflect new structure

## Completion Criteria

- `StatefulSyncHandler.ts` does not exist
- Backend `BaseSyncHandler.ts` does not exist
- `transitions/sale.ts` and `transitions/distribucion.ts` do not exist
- `StateMachineRegistry` only has `staffInvitation` registered
- `transitions/index.ts` only exports staff-invitation types and initialization
- No TypeScript compilation errors from deleted imports
- `bun run build` succeeds

## Validation

- `cd packages/backend && bun run build`
- `rg "StatefulSyncHandler|BaseSyncHandler" packages/backend/src/ --type ts`
- `rg "saleMachine|distribucionMachine" packages/backend/src/ --type ts`
- `rg "StateMachineRegistry.get.*sale|StateMachineRegistry.get.*distribucion" packages/backend/src/ --type ts`

## Risks or Notes

- The `sale.service.ts` (backend business service, not sync handler) may reference `StateMachineRegistry.get("sale")` for the cancel flow (reversal payment + inventory return). If so, this needs to be either:
  - a) Moved to a `withPostOperation` hook on the generic sales handler (like purchase inventory)
  - b) Kept in the business service but triggered via a different mechanism
  - c) Moved to frontend as separate sync operations
  This is an open question in `requirements.md`. Decide before starting this task.
- The `lib/state-machine.ts` utility is still needed for `staffInvitationMachine`. Don't delete it.

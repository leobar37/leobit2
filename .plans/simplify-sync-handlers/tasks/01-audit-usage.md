# T-001 Audit Usage of Custom Handlers and Transitions

## Objective

Map all consumers (imports, references, tests) of the custom sync handlers, state machine transitions, and snapshot fields before migration begins, to avoid breaking hidden dependencies.

## Requirements Covered

- Supports all FR items by establishing the full impact surface

## Dependencies

- none

## Files or Areas Involved

- `packages/backend/src/services/sync-handlers/` - Review all imports and references
- `packages/backend/src/services/business/sync.service.ts` - Review handler registration
- `packages/backend/src/services/transitions/` - Review all imports and registrations
- `packages/backend/src/services/repository/sale.repository.ts` - Review `confirmPreOrder`, `deliverPreOrder`, snapshot-related methods
- `packages/backend/src/lib/state-machine.ts` - Review `StateMachineRegistry` consumers
- `packages/backend/src/**/index.ts` - Review exports
- `packages/app/app/lib/services/sale-service.ts` - Review `createWithItems` and sync operation patterns
- `packages/app/app/lib/services/payment-service.ts` - Review abono creation flow
- Test files: `*.test.ts`, `*.spec.ts` in both packages

## Actions

1. Search for all imports of `SaleSyncHandler`, `DistribucionSyncHandler`, `PurchaseSyncHandler` across the codebase
2. Search for all imports of `StatefulSyncHandler`, `BaseSyncHandler` (backend version) across the codebase
3. Search for all references to `StateMachineRegistry.get("sale")`, `StateMachineRegistry.get("purchase")`, `StateMachineRegistry.get("distribucion")`
4. Search for all references to `confirmPreOrder`, `deliverPreOrder` in repos and services
5. Search for all references to `confirmedSnapshot`, `deliveredSnapshot` (confirmed: write-only, no functional reads)
6. Search for all references to `saleMachine`, `distribucionMachine`, `purchaseMachine` exports
7. Document any test files that directly test custom handlers or transitions
8. Check if `initializeStateMachines` is called from any startup/init code and document the call chain
9. Verify the `patch-utils.ts` and `core/` directory files used by custom handlers
10. Produce a final audit report listing: files to modify, files to delete, files that reference deleted code

## Completion Criteria

- Complete list of all files that import or reference custom handlers, transitions, or snapshot fields
- List of test files that will need updating
- Confirmation that `staffInvitationMachine` is the only remaining state machine after migration
- Clear map of the call chain from `sync.service.ts` → handler registration → handler execution

## Validation

- Grep searches return zero unexpected results
- No hidden consumers missed

## Risks or Notes

- The `SaleSyncHandler` is used in `sync.service.ts` which is the main entry point — this is expected and documented
- Watch for circular dependency patterns between transitions and repositories

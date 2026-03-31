# Sync Centralization Plan

## Objective

Create a low-churn technical path to centralize Avileo’s sync logic around a shared definition layer and an optional frontend coordination facade, while preserving the current push/pull engine, backend handlers, and existing runtime behavior. The plan prioritizes removing drift between frontend and backend definitions before any broader framework work, and excludes expanding the current hook system.

## Scope

- In scope:
  - Introduce a shared sync definition module in `packages/shared/src/`
  - Align frontend and backend on canonical syncable entities and processing priorities
  - Centralize low-risk sync metadata now duplicated across multiple files
  - Add a thin coordinator/facade plan for frontend lifecycle management
  - Remove or retire unused hook infrastructure if it is confirmed unnecessary
  - Add validation coverage for ordering, explicit validation paths, and entity drift
  - Update relevant documentation to reflect the centralized model
- Out of scope:
  - Rewriting `SyncService`, `PullService`, or `SyncEngine`
  - Replacing REST sync with ElectricSQL or another sync stack
  - Generating handlers/resolvers from schema as proposed in `docs/new-sync/FRAMEWORK.md`
  - Reworking all entity handlers or conflict resolvers in one pass
  - Broad database schema redesign unrelated to sync centralization

## Verified Context

- `packages/app/app/lib/services/base-service.ts:153-194` already centralizes enqueue through `queueSync()` and currently calls `runSyncHooks()` before delegating to `syncService.enqueue()`.
- `packages/app/app/lib/sync/registry.ts:10-12` defines `registeredHooks` as an empty array, so the hook layer exists structurally but is inactive.
- `packages/app/app/lib/sync/create-sync-hook.ts:1-69` provides a complete fluent hook builder, but there is no verified current use case for enabling it.
- `packages/app/app/lib/sync/service-provider.tsx:131-187` starts `syncService.startAutoSync()` and `pullService.startAutoPull()` separately and stops them separately, which makes it a viable seam for a future coordinator facade.
- `packages/app/app/lib/sync/config.ts:48-65` defines `SYNCABLE_ENTITIES` with frontend-only values such as `variant_inventory`, `orders`, `order_items`, `files`, and `assets`.
- `packages/backend/src/services/sync/types.ts:1-16` defines `SyncEntity` with backend-supported entities only: `customers`, `sales`, `sale_items`, `abonos`, `distribuciones`, `products`, `product_variants`, `tags`, `customer_tags`, `purchases`, `purchase_items`, `customer_groups`, `customer_group_members`, `visitas`, and `suppliers`.
- `packages/backend/src/api/sync.ts:121-148` hardcodes the accepted `entityType` union in the API schema, duplicating backend entity definitions.
- `packages/app/app/lib/sync/sync-service.ts:668-692` contains a frontend `entityPriority` map for in-group ordering.
- `packages/backend/src/services/sync/framework/OperationSorter.ts:8-27` contains a backend `entityPriority` map with the same role, duplicating ordering policy.
- `packages/app/app/lib/sync/sync-service.ts:155-174` hardcodes `SYNC_STATUS_ENTITY_TABLES` and `SELF_HEAL_INSERTABLE_ENTITIES` in the frontend engine.
- `packages/app/app/lib/sync/schema-mapper.ts:9-58` hardcodes `VALID_TABLES` and `TABLE_MAP`, which represent another sync-related entity inventory.
- `packages/app/app/components/sync/sync-devtools/types.ts:62-94` maintains `TABLES_WITH_SYNC_STATUS` and `SYNCED_TABLES`, which are additional UI-specific sync entity lists.
- `packages/backend/src/services/sync/sync.service.ts:42-102` registers all backend handlers through `HandlerRegistry.register(...)`, so handler wiring is already centralized in one place.
- `packages/backend/src/services/sync/framework/ConflictResolver.ts:529-537` exposes `ConflictResolverRegistry`, which is already a framework-like extension point.
- `packages/shared/src/schema.ts:26-30` exports `SyncStatus`, proving shared package ownership already exists for sync-adjacent constants.
- `docs/new-sync/FRAMEWORK.md` documents a more ambitious schema-driven generator design, but that design is not implemented in the inspected code.

## Assumptions

- `packages/shared/src/` is the safest home for canonical sync definitions because both frontend and backend already depend on `@avileo/shared`.
- The first implementation milestone should centralize definitions only, not behavior, to reduce rollout risk.
- The existing backend handler/engine structure should remain intact and consume shared definitions rather than be replaced.
- Some frontend-only entity names (`orders`, `order_items`, `files`, `assets`, `variant_inventory`) may be legacy or adjacent concerns rather than true sync API entities.
- A future `SyncCoordinator` should wrap existing services instead of absorbing their internals.
- Any validation that remains necessary after centralization should live explicitly in entity services or backend handlers rather than in a generic hook layer.

## Files Involved

- `packages/shared/src/sync-config.ts` - Create - Canonical sync definitions module for entities, priorities, subsets, and helper types
- `packages/shared/src/index.ts` - Modify - Re-export shared sync definitions for frontend/backend consumption
- `packages/app/app/lib/sync/config.ts` - Modify - Keep queue-specific constants local, import canonical entity definitions from shared
- `packages/app/app/lib/sync/sync-service.ts` - Modify - Replace duplicated priority/status/self-heal definitions with shared imports or derived subsets
- `packages/app/app/lib/services/base-service.ts` - Modify - Align table/entity validation with canonical shared sync entity types and remove `runSyncHooks()` if hooks are retired
- `packages/app/app/lib/sync/registry.ts` - Delete or Review - Remove unused hook registry if it is confirmed unnecessary
- `packages/app/app/lib/sync/create-sync-hook.ts` - Delete or Review - Remove unused hook builder if it is confirmed unnecessary
- `packages/app/app/lib/sync/hooks/` - Delete or Review - Remove empty hook barrel or leave only if required by imports during transition
- `packages/app/app/lib/sync/service-provider.tsx` - Modify - Introduce optional `SyncCoordinator` usage or prepare the provider seam for it
- `packages/app/app/lib/sync/coordinator.ts` - Create - Thin facade for starting/stopping and observing push+pull sync without changing engine internals
- `packages/app/app/lib/sync/schema-mapper.ts` - Review/Modify - Decide which values come from shared canonical config versus local safety-only mapping
- `packages/app/app/components/sync/sync-devtools/types.ts` - Modify - Derive UI sync table lists from shared config where possible, leaving UI-only labels local
- `packages/backend/src/services/sync/types.ts` - Modify - Derive `SyncEntity` from shared config instead of maintaining a separate union
- `packages/backend/src/services/sync/framework/OperationSorter.ts` - Modify - Import canonical priorities from shared config
- `packages/backend/src/api/sync.ts` - Modify - Align accepted `entityType` schema with the shared canonical entity list
- `packages/backend/src/services/sync/sync.service.ts` - Review - Keep handler registration intact, but verify shared entity list matches registered handlers
- `packages/backend/src/services/sync/framework/ConflictResolver.ts` - Review - Reserve this as a later consumer of shared per-entity conflict policy
- `packages/app/app/lib/sync/create-sync-hook.test.ts` - Delete or Review - Remove or rewrite if hook infrastructure is retired
- `packages/backend/src/services/sync/handlers/__tests__/sale-sync.race.test.ts` - Review - Ensure priority changes do not regress batch semantics
- `docs/new-sync/FRAMEWORK.md` - Modify - Mark generator approach as future-facing and distinguish it from the low-churn implementation plan
- `docs/new-sync/sync-centralization-report.html` - Review/Optional Modify - Keep aligned with the approved technical direction if this document is treated as living documentation

## Ordered Execution Steps

1. **Define the canonical shared sync model**
   - Files: `packages/shared/src/sync-config.ts`, `packages/shared/src/index.ts`
   - Action: Create a new shared module that becomes the single source of truth for canonical sync API entities, backend/frontend ordering priorities, and entity subsets like `syncStatusTracked` and `selfHealInsertable`.
   - Depends on: none
   - Review snippet:

     ```ts
     // packages/shared/src/sync-config.ts
     export const SYNC_ENTITIES = [
       "customers",
       "sales",
       "sale_items",
       "abonos",
       "distribuciones",
       "products",
       "product_variants",
       "tags",
       "customer_tags",
       "purchases",
       "purchase_items",
       "customer_groups",
       "customer_group_members",
       "visitas",
       "suppliers",
     ] as const;

     export type SyncEntity = (typeof SYNC_ENTITIES)[number];

     export const ENTITY_PRIORITIES: Partial<Record<SyncEntity, number>> = {
       sales: 1,
       sale_items: 2,
       purchases: 1,
       purchase_items: 2,
       products: 1,
       product_variants: 2,
       customer_groups: 1,
       customer_group_members: 2,
     };

     export const SYNC_STATUS_TRACKED = [
       "sales",
       "customers",
       "customer_groups",
       "customer_group_members",
       "visitas",
       "abonos",
       "purchases",
     ] as const;

     export const SELF_HEAL_INSERTABLE = [
       "sales",
       "customers",
       "customer_groups",
       "customer_group_members",
       "visitas",
       "abonos",
       "purchases",
       "purchase_items",
     ] as const;
     ```

2. **Classify canonical vs local-only entity inventories**
   - Files: `packages/app/app/lib/sync/config.ts`, `packages/app/app/lib/sync/schema-mapper.ts`, `packages/app/app/components/sync/sync-devtools/types.ts`, `packages/app/app/lib/services/base-service.ts`
   - Action: Audit every entity list and explicitly split them into (a) canonical sync API entities from shared config and (b) local-only UI or storage lists that must remain local. Remove drift where a list claims to represent sync API entities but actually includes non-API values.
   - Depends on: 1
   - Notes:
     - `SYNCABLE_ENTITIES` in `config.ts` should become a shared import if it represents API-sync entities.
     - `VALID_TABLES` in `schema-mapper.ts` may remain broader than `SYNC_ENTITIES` if it protects pull-apply behavior for local tables.
     - `SYNCED_TABLES` in devtools can remain UI-facing, but should derive its canonical core from shared config.

3. **Align frontend push ordering and entity subsets to shared config**
   - Files: `packages/app/app/lib/sync/sync-service.ts`, `packages/app/app/lib/sync/config.ts`
   - Action: Replace inline priority maps and hardcoded entity subsets with imports from the new shared config. Preserve local queue lifecycle constants like `OPERATION_STATUS`, `BATCH_SIZE`, and backoff settings in `config.ts`.
   - Depends on: 1, 2
   - Review snippet:

     ```ts
     // inside sync-service.ts
     import {
       ENTITY_PRIORITIES,
       SELF_HEAL_INSERTABLE,
       SYNC_STATUS_TRACKED,
     } from "@avileo/shared";

     const SYNC_STATUS_ENTITY_TABLES = new Set(SYNC_STATUS_TRACKED);
     const SELF_HEAL_INSERTABLE_ENTITIES = new Set(SELF_HEAL_INSERTABLE);

     const priorityA = ENTITY_PRIORITIES[a.entity_type as keyof typeof ENTITY_PRIORITIES] ?? 99;
     const priorityB = ENTITY_PRIORITIES[b.entity_type as keyof typeof ENTITY_PRIORITIES] ?? 99;
     ```

4. **Align backend sync typing and request contract**
   - Files: `packages/backend/src/services/sync/types.ts`, `packages/backend/src/api/sync.ts`
   - Action: Derive backend `SyncEntity` from shared config and eliminate manual drift in the sync API route schema. If direct derivation from `SYNC_ENTITIES` is awkward with Elysia `t.Union`, add a small helper in the backend layer that converts the canonical list into route literals.
   - Depends on: 1
   - Review snippet:

     ```ts
     // packages/backend/src/services/sync/types.ts
     import type { SyncEntity } from "@avileo/shared";

     export type { SyncEntity };

     // packages/backend/src/api/sync.ts
     import { SYNC_ENTITIES } from "@avileo/shared";

     const syncEntityLiterals = SYNC_ENTITIES.map((entity) => t.Literal(entity));
     // then use t.Union(syncEntityLiterals)
     ```

5. **Align backend ordering and registry assumptions**
   - Files: `packages/backend/src/services/sync/framework/OperationSorter.ts`, `packages/backend/src/services/sync/sync.service.ts`
   - Action: Replace the inline backend priority map with shared priorities and verify the handler registry covers every canonical backend sync entity. If any entity in `SYNC_ENTITIES` lacks a backend handler, remove it from the canonical list or plan its handler separately before rollout.
   - Depends on: 1, 4
   - Notes:
     - Keep `registerHandlers()` intact as the current backend framework seam.
     - Do not refactor handler creation beyond what is needed for validation against the shared list.

6. **Retire unused hook infrastructure and keep validation explicit**
   - Files: `packages/app/app/lib/services/base-service.ts`, `packages/app/app/lib/sync/registry.ts`, `packages/app/app/lib/sync/create-sync-hook.ts`, `packages/app/app/lib/sync/hooks/`, `packages/app/app/lib/sync/create-sync-hook.test.ts`
   - Action: Remove `runSyncHooks()` from `queueSync()` and delete the unused hook support files if no remaining import depends on them. Keep business validation explicit in entity services and backend handlers instead of routing it through a generic hook layer.
   - Depends on: 1, 2
   - Review snippet:

     ```ts
     // packages/app/app/lib/services/base-service.ts
     protected async queueSync(
       action: SyncAction,
       entityId: string,
       payload: Record<string, unknown>,
       syncGroupId?: string,
       entityTypeOverride?: EntityType,
       entityVersion?: number,
     ): Promise<void> {
       const entityType = entityTypeOverride ?? this.getEntityType();

       const params: EnqueueParams = {
         entity_type: entityType,
         operation: action,
         entityId,
         data: {
           ...payload,
           ...(entityVersion !== undefined && { _localVersion: entityVersion }),
         },
         idempotencyKey: generateId(),
         syncGroupId,
       };

       await this.syncService.enqueue(params);
     }
     ```

7. **Introduce a thin frontend sync coordinator without changing engine internals**
   - Files: `packages/app/app/lib/sync/coordinator.ts`, `packages/app/app/lib/sync/service-provider.tsx`, `packages/app/app/hooks/use-sync-status.ts`, optionally `packages/app/app/hooks/use-manual-sync.ts`
   - Action: Add a facade that owns `start()`, `stop()`, and high-level status access for push and pull together. Keep `SyncService` and `PullService` intact; the coordinator should only orchestrate them and reduce duplication inside `service-provider.tsx`.
   - Depends on: 3
   - Review snippet:

     ```ts
     // packages/app/app/lib/sync/coordinator.ts
     export class SyncCoordinator {
       constructor(
         private syncService: SyncService,
         private pullService: PullService,
       ) {}

       start() {
         this.syncService.startAutoSync();
         this.pullService.startAutoPull();
       }

       stop() {
         this.syncService.stopAutoSync();
         this.pullService.stopAutoPull();
       }

       async getCombinedStatus() {
         return {
           push: await this.syncService.getStatus(),
           pull: this.pullService.getStatus(),
         };
       }
     }
     ```

8. **Document future-facing framework boundaries explicitly**
   - Files: `docs/new-sync/FRAMEWORK.md`, `docs/new-sync/sync-centralization-report.html`
   - Action: Update documentation so the low-churn implementation path is clearly separated from the larger generator-based framework proposal. The shared-definition approach should be documented as the current approved path; code generation should remain a future option, not an implied requirement.
   - Depends on: 1, 7

9. **Add validation coverage for drift, ordering, and explicit validation paths**
   - Files: new frontend sync tests near `packages/app/app/lib/sync/`, tests near `packages/app/app/lib/services/` where appropriate, existing backend tests under `packages/backend/src/services/sync/handlers/__tests__/`, and any new backend framework tests near `OperationSorter.ts`
   - Action: Add tests that fail when shared entity config and consuming layers drift apart, verify ordering semantics, and verify that required validation still happens through explicit services or handlers after hook removal.
   - Depends on: 3, 4, 5, 6

10. **Reassess deferred improvements after stabilization**
    - Files: `packages/backend/src/services/sync/framework/ConflictResolver.ts`, `packages/backend/src/services/sync/sync.service.ts`, `packages/app/app/lib/sync/schema-mapper.ts`
    - Action: After the definition layer is stable, reassess whether per-entity conflict policy should move into shared config and whether pull-related table configuration should be further centralized. Keep these as a second wave to avoid coupling centralization with behavior changes.
    - Depends on: 9

## Risks and Edge Cases

- Frontend currently claims some entities are syncable that the backend does not accept; if this is intentional legacy behavior, canonicalization could break existing hidden flows unless those flows are explicitly retired or supported.
- `schema-mapper.ts` may legitimately need a broader table whitelist than the sync API entity list; forcing them to be identical could break pull-apply behavior.
- `entityPriority` semantics are not fully identical across all current usages. The frontend query-level ordering and within-group ordering may need different constructs even if they share one canonical ranking source.
- If `distribucion` vs `distribuciones` naming inconsistencies still exist in runtime code paths, centralization can surface them quickly. These mismatches must be resolved deliberately, not masked.
- Introducing a coordinator facade can accidentally duplicate status polling or lifecycle work if `service-provider.tsx` still directly manages the underlying services.
- Removing the hook layer can expose hidden dependencies if any path was relying on `runSyncHooks()` as a silent interception point.
- Validation moved out of hooks must remain easy to discover, otherwise business rules may become scattered across services again.
- Deriving `t.Union` from shared lists in Elysia may require a small local helper due to runtime literal construction constraints.
- If backend handler registration does not cover every canonical entity, the plan must stop at alignment and not force unsupported entities into the shared list.

## Validation Strategy

### Mandatory validation

- Build `@avileo/shared` after adding `sync-config.ts` to verify there are no export or type issues.
- Run app type checking after frontend imports are changed.
- Run backend type checking/build after backend `SyncEntity` and route schema alignment.
- Add tests that assert every canonical `SYNC_ENTITIES` value is either accepted by backend API schema and/or explicitly classified as local-only.
- Add tests for ordering behavior in frontend and backend to prove that shared priorities preserve parent-before-child processing.
- Add tests to prove `queueSync()` behavior stays stable after removing hook invocation.
- Perform a manual offline flow in staging or dev: create grouped records offline, reconnect, trigger sync, verify parent/child order and explicit validation behavior.
- Verify the devtools still render useful entity lists after canonical/local-only split.

### Recommended engine-focused tests

- Run the existing backend sync handler race test and any related sync tests to ensure no ordering regressions.
- Add a focused backend `OperationSorter` test that proves shared priorities are consumed correctly.
- Add a frontend grouped-operations test around `sync-service.ts` to prove shared ordering stays aligned with backend expectations.
- Add a regression test that verifies unsupported/legacy frontend-only entity names are not treated as canonical sync API entities.

### Deferred / optional tests

- Add broader end-to-end sync engine scenarios only if the centralization work starts touching runtime engine behavior beyond shared definitions and coordination.

## Open Questions

- Should `variant_inventory`, `orders`, `order_items`, `files`, and `assets` remain in any sync-facing list, or are they legacy/frontend-only concerns that should be removed from canonical sync definitions?
- Should `schema-mapper.ts` be driven entirely by canonical shared config, or should it remain a separate local safety layer with a documented superset of tables?
- Is there any real near-term validation rule that cannot be expressed more clearly in an entity service or backend handler?
- Do we want a shared per-entity conflict policy in this phase, or should `ConflictResolverRegistry` remain backend-owned until the definition layer is stable?
- Is the coordinator facade intended only for lifecycle orchestration, or should it also become the future entry point for manual sync and status aggregation?
- Should UI/debug-specific lists in `sync-devtools/types.ts` derive fully from shared config, or only derive the canonical base while keeping presentation-specific tables local?

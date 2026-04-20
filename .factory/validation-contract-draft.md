# Validation Contract - Avileo Sync Core Integration Mission

## Milestone 0: Stabilization

### VAL-0-001: Generator output path unified
The sync generator must output to a single, consistent directory that matches all import paths in the app.
**Pass:** `bun run sync:generate` produces files at the path expected by `app/lib/sync/schema/index.ts` and all service imports.
**Fail:** Build fails with "Could not resolve" for generated files.
**Tool:** `bun run build`
**Evidence:** Build output shows success for all packages.

### VAL-0-002: App build succeeds
`bun run build` from repo root must complete successfully for all packages.
**Pass:** All 4 packages build without errors.
**Fail:** Any package fails to build.
**Tool:** `bun run build`
**Evidence:** Build output with exit code 0.

### VAL-0-003: Backend typecheck script exists
`packages/backend/package.json` must have a `typecheck` script.
**Pass:** `cd packages/backend && bun run typecheck` executes `tsc --noEmit` successfully.
**Fail:** Script not found or typecheck fails.
**Tool:** `bun run typecheck` (backend)
**Evidence:** Command output with exit code 0.

### VAL-0-004: App typecheck passes
`cd packages/app && bun run typecheck` must pass with zero errors.
**Pass:** No TypeScript errors.
**Fail:** Any type error reported.
**Tool:** `bun run typecheck` (app)
**Evidence:** Typecheck output with error count = 0.

### VAL-0-005: Backend tests pass
`cd packages/backend && bun test --run` must pass.
**Pass:** All tests pass (or pre-existing failures documented).
**Fail:** New test failures introduced by mission changes.
**Tool:** `bun test --run` (backend)
**Evidence:** Test output with pass/fail counts.

### VAL-0-006: App sync engine tests pass
`cd packages/app && bun test --run` must have all sync-related tests passing.
**Pass:** sync-service, change-applier, ordering, staged-pull tests pass.
**Fail:** Any sync test fails.
**Tool:** `bun test --run` (app)
**Evidence:** Test output for sync test files.

### VAL-0-007: No duplicate generated directories
Only one generated directory exists (`lib/sync/generated` OR `lib/db/generated`), not both.
**Pass:** Single directory with all 6 generated files.
**Fail:** Both directories exist with different content.
**Tool:** `ls`
**Evidence:** Directory listing.

## Milestone 1: Sync Engine Evolution (FK-based Ordering)

### VAL-1-001: OperationSorter topological sort by FK
Given a batch with a `sales` operation (entityId: "sale_123") and a `sale_items` operation (payload.sale_id: "sale_123"), the sorter must place the sale before the item.
**Pass:** `sorted[0].entityType === "sales" && sorted[1].entityType === "sale_items"`.
**Fail:** Item comes before sale or order is undefined.
**Tool:** Unit test
**Evidence:** Test output showing sort order.

### VAL-1-002: OperationSorter handles multi-parent dependencies
A `sale_items` operation referencing both `sales` and `products` must come after both parents.
**Pass:** Item is placed after all referenced parent operations.
**Fail:** Item placed before any parent.
**Tool:** Unit test
**Evidence:** Test output with 3+ operations.

### VAL-1-003: syncGroupId is optional
`EnqueueParams.syncGroupId` and `SyncOperationInput.syncGroupId` must be optional (undefined allowed).
**Pass:** Operations enqueued without syncGroupId are processed correctly.
**Fail:** Type error or runtime error when syncGroupId is omitted.
**Tool:** Typecheck + unit test
**Evidence:** Typecheck passes, test enqueues without syncGroupId.

### VAL-1-004: Backward compatibility with syncGroupId
Operations WITH syncGroupId must still be sorted correctly (legacy behavior preserved).
**Pass:** Mixed batch (some with syncGroupId, some without) sorts correctly.
**Fail:** Legacy operations break or sort incorrectly.
**Tool:** Unit test
**Evidence:** Test with mixed operations.

## Milestone 2: Generator Update

### VAL-2-001: Junction tables omit businessId
Generated `CustomerTagsService` and `CustomerGroupMembersService` must NOT include `businessId` in insert/findByBusiness.
**Pass:** No reference to `businessId` in generated junction table services.
**Fail:** `businessId` appears in insert or filter for junction tables.
**Tool:** Grep generated code
**Evidence:** Grep output.

### VAL-2-002: Generated hooks omit syncGroupId
Generated React hooks must not pass `syncGroupId` to enqueue operations.
**Pass:** Hooks use FK references (e.g., `sale_id: parentId`) instead of syncGroupId.
**Fail:** Hooks still generate and pass syncGroupId.
**Tool:** Read generated hooks.ts
**Evidence:** Code inspection.

### VAL-2-003: Generated services omit generateSyncGroup
Generated BaseService subclasses must not call `generateSyncGroup()`.
**Pass:** No `generateSyncGroup` in generated service code.
**Fail:** Generated services still use syncGroup.
**Tool:** Grep generated code
**Evidence:** Grep output.

### VAL-2-004: All 16 entities generate successfully
`bun run sync:generate` must produce code for all 16 entities without errors.
**Pass:** 16 services, 16 hooks, 16 schemas generated.
**Fail:** Any entity fails to generate.
**Tool:** `bun run sync:generate`
**Evidence:** Generator output.

### VAL-2-005: Generated code compiles
All generated TypeScript files must compile without errors.
**Pass:** `bun run typecheck` passes after regeneration.
**Fail:** Type errors in generated code.
**Tool:** `bun run typecheck`
**Evidence:** Typecheck output.

### VAL-2-006: Date fields use string type
Generated services must use `string` (not `Date`) for timestamp columns to match BaseService.now() return type.
**Pass:** `createdAt: string` in CreateInput interfaces.
**Fail:** `createdAt: Date` causing type mismatches.
**Tool:** Read generated services.ts
**Evidence:** Code inspection.

### VAL-2-007: Regenerated code matches schema
Generated code must reflect the current backend schema (no stale fields).
**Pass:** All fields in backend tables appear in generated schemas.
**Fail:** Missing or extra fields.
**Tool:** Diff backend schema vs generated schemas
**Evidence:** Comparison report.

## Milestone 3: Simple Services Migration

### VAL-3-001: CustomerService extends CustomersService
`packages/app/app/lib/services/customer-service.ts` must extend `CustomersService` from generated code.
**Pass:** `class CustomerService extends CustomersService` with search/filter overrides.
**Fail:** Still fully manual or doesn't compile.
**Tool:** Read file + typecheck
**Evidence:** File content + typecheck output.

### VAL-3-002: CustomerService search works
CustomerService search with tag/group filtering and pagination must work correctly.
**Pass:** Search returns filtered results, pagination works.
**Fail:** Search broken or returns wrong results.
**Tool:** Unit test
**Evidence:** Test output.

### VAL-3-003: ProductService extends ProductsService
`product-service.ts` must extend `ProductsService` with variant management overrides.
**Pass:** Extends generated class, adds variant methods.
**Fail:** Still manual or broken.
**Tool:** Read file + typecheck
**Evidence:** File content.

### VAL-3-004: PaymentService extends AbonosService
`payment-service.ts` must extend `AbonosService` with payment logic.
**Pass:** Extends generated class, payment methods work.
**Fail:** Still manual or broken.
**Tool:** Read file + typecheck
**Evidence:** File content.

### VAL-3-005: All migrated services compile
All services in Milestone 3 must compile without type errors.
**Pass:** `bun run typecheck` passes.
**Fail:** Any type error in migrated services.
**Tool:** `bun run typecheck`
**Evidence:** Typecheck output.

### VAL-3-006: Backward compatible exports
Migrated services must re-export types for backward compatibility (e.g., `CreateCustomerInput`).
**Pass:** Existing imports still work.
**Fail:** Import errors in consuming code.
**Tool:** `bun run typecheck`
**Evidence:** No import errors.

## Milestone 4: Complex Services Migration (Parent-Child)

### VAL-4-001: PurchaseService extends PurchasesService
`purchase-service.ts` must extend `PurchasesService` with atomic items operations.
**Pass:** Extends generated class, `createWithItems` works atomically.
**Fail:** Still manual or items not atomic.
**Tool:** Read file + unit test
**Evidence:** File content + test output.

### VAL-4-002: DistribucionService extends DistribucionesService
`distribucion-service.ts` must extend `DistribucionesService` with atomic items operations.
**Pass:** Extends generated class, items operations work.
**Fail:** Still manual or broken.
**Tool:** Read file + unit test
**Evidence:** File content.

### VAL-4-003: Parent-child atomic operations work
Creating a purchase/distribucion with items must queue both parent and child operations correctly.
**Pass:** Parent queued before child, FK reference used (not syncGroupId).
**Fail:** Operations not queued or wrong ordering.
**Tool:** Unit test
**Evidence:** Test output showing queue state.

### VAL-4-004: Complex services compile
All services in Milestone 4 must compile without errors.
**Pass:** `bun run typecheck` passes.
**Fail:** Any type error.
**Tool:** `bun run typecheck`
**Evidence:** Typecheck output.

## Milestone 5: Special Services

### VAL-5-001: VisitaService extends VisitasService
`visita-service.ts` must extend `VisitasService` with enriched return types.
**Pass:** `class VisitaService extends VisitasService`, `findById` returns `VisitaWithCustomer`.
**Fail:** Type conflict with base class or broken.
**Tool:** Read file + typecheck
**Evidence:** File content.

### VAL-5-002: CustomerGroupService extends CustomerGroupsService
`customer-group-service.ts` must extend `CustomerGroupsService` with member management.
**Pass:** Extends generated class, returns `CustomerGroupWithMembers`.
**Fail:** Type conflict or broken.
**Tool:** Read file + typecheck
**Evidence:** File content.

### VAL-5-003: SaleService uses generated CRUD base
`sale-service.ts` must use `SalesService` generated for basic CRUD (findById, findByBusiness, create, update, delete).
**Pass:** SaleService delegates basic CRUD to generated base or extends it.
**Fail:** All CRUD still manual.
**Tool:** Read file + typecheck
**Evidence:** File content.

### VAL-5-004: SaleService business logic preserved
Sale state machine (confirm, deliver, cancel), atomic items, payments must still work.
**Pass:** All business logic methods function correctly.
**Fail:** Any business logic broken.
**Tool:** Unit test
**Evidence:** Test output.

### VAL-5-005: SaleService uses FK references (not syncGroupId)
Sale items operations must reference sale by real ID, not syncGroupId.
**Pass:** `queueSync` calls for items use `saleId` in payload, no syncGroupId.
**Fail:** Still using generateSyncGroup().
**Tool:** Read file + grep
**Evidence:** Code inspection.

### VAL-5-006: Special services compile
All services in Milestone 5 must compile without errors.
**Pass:** `bun run typecheck` passes.
**Fail:** Any type error.
**Tool:** `bun run typecheck`
**Evidence:** Typecheck output.

## Milestone 6: Cleanup & Final Validation

### VAL-6-001: sync_group_id column removed
`sync_operations` table schema no longer has `sync_group_id` column.
**Pass:** Column removed from DDL and code.
**Fail:** Column still referenced.
**Tool:** Grep codebase
**Evidence:** Grep output showing no references.

### VAL-6-002: generateSyncGroup removed from BaseService
`BaseService.generateSyncGroup()` method removed.
**Pass:** Method no longer exists.
**Fail:** Method still present.
**Tool:** Read base-service.ts
**Evidence:** File content.

### VAL-6-003: All services work offline-first
All migrated services must create local records and queue sync operations correctly.
**Pass:** Creating a customer/sale/product locally queues a sync operation.
**Fail:** Data created but not queued for sync.
**Tool:** Unit test
**Evidence:** Test output.

### VAL-6-004: Full build passes
`bun run build` from repo root must succeed.
**Pass:** All packages build.
**Fail:** Any build error.
**Tool:** `bun run build`
**Evidence:** Build output.

### VAL-6-005: Full typecheck passes
`bun run typecheck` in both packages must pass.
**Pass:** Zero type errors.
**Fail:** Any type error.
**Tool:** `bun run typecheck` (both packages)
**Evidence:** Typecheck output.

### VAL-6-006: All tests pass
`bun test --run` in both packages must pass.
**Pass:** All tests pass (or pre-existing failures documented).
**Fail:** New test failures.
**Tool:** `bun test --run` (both packages)
**Evidence:** Test output.

## Cross-Milestone Flows

### VAL-CROSS-001: FK ordering end-to-end
Creating a sale with items offline, then syncing, must result in the server processing the sale before the items.
**Pass:** Server processes sale first, then items, no FK constraint errors.
**Fail:** Server tries to insert item before sale, FK error.
**Tool:** Unit test (mock server pipeline)
**Evidence:** Test output.

### VAL-CROSS-002: Service chain integrity
A flow like: create customer → create sale for customer → add payment must work through migrated services.
**Pass:** All operations succeed, sync queue has correct operations.
**Fail:** Any step fails.
**Tool:** Unit test
**Evidence:** Test output.

### VAL-CROSS-003: Queue integrity without syncGroupId
Sync queue must correctly order and process operations without syncGroupId.
**Pass:** Operations processed in correct order (parents before children).
**Fail:** Wrong order or operations lost.
**Tool:** Unit test
**Evidence:** Test output.

### VAL-CROSS-004: Type safety across all services
All service methods must have correct TypeScript types (no `any`, no implicit types).
**Pass:** `bun run typecheck` with strict settings passes.
**Fail:** Type errors or implicit any.
**Tool:** `bun run typecheck`
**Evidence:** Typecheck output.

### VAL-CROSS-005: Backward compatibility
Existing code that imports from migrated services must still work without changes.
**Pass:** All existing imports compile.
**Fail:** Import errors or type mismatches.
**Tool:** `bun run typecheck`
**Evidence:** No import-related errors.

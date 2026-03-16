---
name: sync-fix-worker
description: Fixes offline/sync bugs in frontend services, backend handlers, and config files
---

# Sync Fix Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this worker for features that fix bugs in:
- Frontend entity services (packages/app/app/lib/services/)
- Frontend sync configuration (packages/app/app/lib/sync/)
- Frontend PGlite schema (packages/app/app/engine/)
- Backend sync handlers (packages/backend/src/services/sync/handlers/)
- Backend API routes (packages/backend/src/api/)
- Backend services (packages/backend/src/services/)

## Work Procedure

1. **Read the feature description carefully.** Understand what assertion IDs this feature fulfills and what the expected behavior is.

2. **Read the affected files.** Before making any changes, read all files mentioned in the feature description and preconditions. Understand the current code structure and patterns.

3. **Write tests first (if applicable).** If there are existing test files for the module being changed, add test cases FIRST that verify the expected behavior. Run them to confirm they fail (red). If no test infrastructure exists for that specific module, skip to step 4.

4. **Implement the fix.** Make the minimum changes needed to fix the bug. Follow existing code patterns:
   - Frontend services: Follow BaseService patterns, use `this.businessId`, `this.pg`, `this.queueSync()`
   - Backend handlers: Follow BaseSyncHandler patterns, use `operation.entityId`, `ctx`
   - Config files: Follow existing array/object patterns
   - ALWAYS use English comments only
   - ALWAYS match existing code style (indentation, naming, imports)

5. **Run tests (green).** Run the tests from step 3 to confirm they pass. Also run existing tests to check for regressions:
   - `cd packages/app && bun run test --run` for frontend changes
   - `cd packages/backend && bun run test --run` for backend changes

6. **Run typecheck.** For frontend changes: `cd packages/app && bun run typecheck`. Fix any type errors introduced.

7. **Run build.** `bun run build` at repo root. Fix any build errors.

8. **Verify manually via code inspection.** Re-read the changed files and confirm:
   - The fix addresses the exact issue described
   - No unintended side effects
   - The code follows project conventions (RequestContext first param, businessId filtering, etc.)

## Key References

- Sync service: `packages/app/app/lib/sync/sync-service.ts`
- Shape config: `packages/app/app/lib/sync/shape-config.ts`
- PGlite tables: `packages/app/app/engine/db.ts`
- Base service: `packages/app/app/lib/services/base-service.ts`
- Backend sync handlers: `packages/backend/src/services/sync/handlers/`
- Backend sync schemas: `packages/backend/src/services/sync/schemas/index.ts`

## Example Handoff

```json
{
  "salientSummary": "Fixed abono sync payload casing mismatch: changed PaymentService.create() to use camelCase keys (customerId, paymentMethod) matching backend abonoCreateSchema. Ran typecheck (pass) and existing tests (3 passing, 0 failing). Code inspection confirms payload matches schema.",
  "whatWasImplemented": "Changed PaymentService.create() sync payload from snake_case (customer_id, payment_method, seller_id, proof_image_id, reference_number, related_sale_id) to camelCase (customerId, paymentMethod, sellerId, proofImageId, referenceNumber, relatedSaleId) to match backend abonoCreateSchema validation. Also updated the sync payload structure to be consistent with other entity services.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {"command": "cd packages/app && bun run typecheck", "exitCode": 0, "observation": "No type errors"},
      {"command": "cd packages/app && bun run test --run", "exitCode": 0, "observation": "3 test suites, 12 tests passing, 0 failures"},
      {"command": "bun run build", "exitCode": 0, "observation": "Build succeeded for all packages"}
    ],
    "interactiveChecks": [
      {"action": "Code inspection of payment-service.ts queueSync call", "observed": "All keys are now camelCase: customerId, sellerId, amount, paymentMethod, notes, referenceNumber, relatedSaleId. Matches abonoCreateSchema field names exactly."}
    ]
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A fix requires changing the sync engine framework itself (SyncEngine.ts, SyncPipeline.ts) — these are off-limits
- A fix requires database schema migration (Drizzle migration files)
- The feature depends on another feature that hasn't been implemented yet
- Existing tests fail for reasons unrelated to the current fix
- The bug described in the feature doesn't match what you see in the code

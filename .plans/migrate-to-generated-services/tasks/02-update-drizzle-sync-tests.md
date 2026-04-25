# T-002 Update drizzle-sync Tests

## Objective

Update `drizzle-sync` unit tests to reflect the new factory signature where `definition.factory` receives `SyncClientEngine` instead of `SyncClientEngineContext`.

## Requirements Covered

- `FR-001`
- `FR-002`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/client/__tests__/sync-client-engine.test.ts` — Update "factory receives correct context" test

## Actions

1. Locate the test "factory receives correct context" (around line 191)

2. Update the test to verify the factory receives `SyncClientEngine`:
   ```typescript
   it("factory receives the engine instance", async () => {
     let receivedEngine: any = null;

     const entityDef: EntityServiceDefinition = {
       name: "test",
       entityType: "test",
       factory: (engine) => {
         receivedEngine = engine;
         return {};
       },
     };

     // ... rest of test

     expect(receivedEngine).toBeDefined();
     expect(receivedEngine.tenantId).toBe("biz-001");
     expect(receivedEngine.userId).toBe("user-001");
     expect(receivedEngine.getPg).toBeDefined();
     expect(receivedEngine.getDb).toBeDefined();
     expect(receivedEngine.getSyncOperations).toBeDefined();
   });
   ```

3. Check for any other tests that mock or spy on `definition.factory` and update them to expect an engine parameter instead of context

4. Run the full `sync-client-engine` test suite and fix any failures

## Completion Criteria

- All tests in `sync-client-engine.test.ts` pass
- The factory test specifically asserts the parameter is a `SyncClientEngine` with expected methods

## Validation

- `cd packages/drizzle-sync && bun test src/client/__tests__/sync-client-engine.test.ts`
- `cd packages/drizzle-sync && bun test` (full suite)

## Risks or Notes

- The `createMockConfig` helper creates mock `pg` and `db` instances. Ensure the factory test still works with these mocks.
- If other test files reference `SyncClientEngineContext` in factory-related tests, update those too.

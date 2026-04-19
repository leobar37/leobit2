---
name: frontend-migrate-worker
description: Migrate manual frontend code to generated versions
---

# Frontend Migrate Worker

## When to Use This Skill

Features that replace manual frontend services/hooks with generated versions from drizzle-sync. This worker handles the migration of existing code to use generated equivalents.

## Required Skills

- `avileo` - For project-specific context about service patterns

## Work Procedure

1. **Generate the code** - Run the generator to produce the new service/hook files:
   ```bash
   cd packages/drizzle-sync && bun run generate
   ```
   Or use the generator programmatically if a script exists.

2. **Compare manual vs generated** - Read the manual file (e.g., `tag-service.ts`) and the generated file side by side. Identify:
   - Methods that match exactly (can be replaced)
   - Methods that differ (need custom extension)
   - Methods in manual that don't exist in generated (custom business logic)

3. **Decide migration strategy**:
   - **Full replace**: If generated matches manual exactly, replace the file
   - **Re-export**: If generated is in `lib/sync/generated/`, make manual file re-export
   - **Extend**: If manual has custom methods, create a class that extends the generated one

4. **Implement migration**:
   - For full replace: delete manual, update imports
   - For re-export: `export { GeneratedService as ManualService } from "../sync/generated/services"`
   - For extend: `class CustomService extends GeneratedService { customMethods() }`

5. **Verify compilation**:
   ```bash
   cd packages/app && bun run typecheck
   ```

6. **Run tests**:
   ```bash
   cd packages/app && bun test
   ```

7. **Check for import regressions**:
   - Search for imports of the old manual service
   - Ensure they still resolve

## Example Handoff

```json
{
  "salientSummary": "Migrated TagService from manual to generated version. Generated service matches manual API. Preserved getCustomerCount as extension. TypeScript compiles, no test regressions.",
  "whatWasImplemented": "Generated TagService using service generator. Created packages/app/app/lib/services/tag-service.ts as a thin wrapper that extends the generated service and adds getCustomerCount(). Updated all imports. Verified compilation and tests.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/app && bun run typecheck", "exitCode": 0, "observation": "0 errors" },
      { "command": "cd packages/app && bun test", "exitCode": 0, "observation": "All tests pass, no new failures" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Generated service doesn't match manual API surface
- Custom methods are too complex to extend
- Import paths would break across many files
- Type compilation fails with errors in unrelated code

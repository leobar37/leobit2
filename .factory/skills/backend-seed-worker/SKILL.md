---
name: backend-seed-worker
description: Extend and validate the executable client1 seed/import path for consolidated notebook data
---

# Backend Seed Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for features that:
- extend the existing `--client1` backend seed path
- load the consolidated JUAVIK JSON into Avileo
- create/map products, variants, customers, sales, and payments for `cliente1@gmail.com`
- validate imported balances and rerun behavior

## Required Skills

- `avileo` — invoke at the start for project/domain context
- `backend-worker` — invoke when implementing backend tests, seed logic, repository/service checks, or runtime verification paths

## Work Procedure

1. Read `mission.md`, mission `AGENTS.md`, `.factory/library/architecture.md`, `.factory/library/seed-import.md`, and the existing backend seed files under `packages/backend/src/seed/`.
2. Reuse the existing `--client1` seed path. Never create a parallel target account or import into a different business.
3. If you add or change backend code, write failing tests first before implementation.
4. Implement the import flow so it can consume the consolidated JUAVIK JSON and:
   - reuse client1 business context
   - create/map missing products and variants
   - create customers
   - import sales and payments with valid references
5. Preserve or explicitly define rerun behavior. Do not allow silent duplication.
6. Validate with targeted backend tests first, then with the executable import command, then with post-import balance checks against the consolidated debt snapshot.
7. Avoid destructive DB reset flows unless the assigned feature explicitly authorizes them.
8. End with a handoff that includes exact import commands, test results, sampled imported records, and balance verification results.

## Example Handoff

```json
{
  "salientSummary": "Extended the existing client1 seed flow to import the consolidated JUAVIK JSON and validated the import with backend tests plus a live import run. Missing product variants were created as needed, and sampled imported balances matched the consolidated debt snapshot.",
  "whatWasImplemented": "Added notebook-data loading to the `--client1` seed/import path, mapped consolidated customers/sales/payments into Avileo entities, created missing variants where needed, and implemented bounded rerun behavior with post-import balance verification.",
  "whatWasLeftUndone": "Only the sampled semantic audit feature remains for full end-to-end trace/balance reporting.",
  "verification": {
    "commandsRun": [
      {
        "command": "cd packages/backend && bun run test:run -- notebook-seed-import",
        "exitCode": 0,
        "observation": "Targeted seed/import tests passed."
      },
      {
        "command": "cd packages/backend && bun run src/seed/index.ts --client1 --juavik-file ../../data-avileo/consolidated/juavik-client1-seed.json",
        "exitCode": 0,
        "observation": "Import command completed successfully and reported created/mapped customers, products, sales, and payments."
      },
      {
        "command": "python3 - <<'PY' ... compare imported client balances to consolidated debtsSnapshot ... PY",
        "exitCode": 0,
        "observation": "Sampled imported balances matched the consolidated debt snapshot."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Inspected sampled imported records for one customer, one product variant, one sale, and one payment after the import run.",
        "observed": "All sampled records belonged to the existing client1 business context and linked correctly."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "packages/backend/tests/notebook-seed-import.test.ts",
        "cases": [
          {
            "name": "reuses the existing client1 business context",
            "verifies": "The import path targets the existing client1 business instead of creating a new account."
          },
          {
            "name": "prevents silent duplication on rerun",
            "verifies": "Rerun behavior is bounded and observable."
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The import requires destructive cleanup not authorized by the current feature
- The existing client1 seed path cannot be safely extended without changing mission scope
- The consolidated JSON is missing required references to create valid imported relationships

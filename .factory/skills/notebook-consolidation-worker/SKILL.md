---
name: notebook-consolidation-worker
description: Normalize canonical notebook extractions into one consolidated import JSON with traceability and debt consistency
---

# Notebook Consolidation Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for features that:
- normalize customer or product identities across canonical sheet outputs
- build the single consolidated JUAVIK seed JSON
- compute/verify debt snapshot consistency
- generate traceability and review reports bridging notebook evidence to import-ready records

## Required Skills

- `avileo` — invoke at the start for project/domain context

## Work Procedure

1. Read `mission.md`, mission `AGENTS.md`, `.factory/library/architecture.md`, `.factory/library/notebook-data.md`, and `.factory/library/seed-import.md`.
2. Use canonical extraction JSON as the only source of truth for consolidation.
3. If you introduce transformation code or validation scripts, write failing tests first before implementation.
4. Normalize repeated customers/products carefully:
   - keep raw evidence and source references
   - keep ambiguous mappings flagged
   - do not silently merge unrelated records
5. Build the single consolidated JSON under `data-avileo/consolidated/` with the required sections for import plus review/source metadata.
6. Compute explicit debt snapshot data from consolidated credit sales and payments, then verify it numerically.
7. Validate the consolidated output by parsing JSON, checking references, and running any added tests/scripts.
8. End with a handoff that includes counts, traceability samples, and debt-consistency results.

## Example Handoff

```json
{
  "salientSummary": "Built the consolidated JUAVIK seed JSON from canonical sheet outputs and normalized repeated customer/product identities with source traceability. Added debt consistency checks and confirmed the explicit debt snapshot matched consolidated credit sales minus payments.",
  "whatWasImplemented": "Created the consolidated notebook import dataset with customers, products, productVariants, sales, payments, debtsSnapshot, and review/source metadata, plus normalization maps and validation logic for customer/product traces and debt consistency.",
  "whatWasLeftUndone": "Executable import into the existing client1 seed path is still pending in later backend seed features.",
  "verification": {
    "commandsRun": [
      {
        "command": "python3 - <<'PY' ... json.load consolidated file and summarize sections ... PY",
        "exitCode": 0,
        "observation": "Consolidated JSON parsed successfully and included all required sections."
      },
      {
        "command": "python3 - <<'PY' ... verify every sourceTrace points to an existing canonical extraction record ... PY",
        "exitCode": 0,
        "observation": "Sampled customer and product traces resolved back to canonical sheet evidence."
      },
      {
        "command": "cd packages/backend && bun run test:run -- consolidated-notebook",
        "exitCode": 0,
        "observation": "Targeted consolidation/debt tests passed."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Manually reviewed three ambiguous consolidated customer/product mappings against canonical extraction sources.",
        "observed": "Best-effort mappings remained flagged and traceable; no sampled ambiguous mapping was silently treated as certain."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "packages/backend/tests/notebook-consolidation.test.ts",
        "cases": [
          {
            "name": "computes debtsSnapshot from consolidated credit sales and payments",
            "verifies": "The explicit debt snapshot matches credit sales minus payments per customer."
          },
          {
            "name": "keeps source traces on normalized customer records",
            "verifies": "Normalized customer records remain traceable back to canonical extraction evidence."
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Canonical extraction quality is too inconsistent to normalize safely without a scope/strategy decision
- The requested consolidated schema needs additional user/product business rules not present in mission guidance
- Debt semantics require changing the agreed best-effort import policy

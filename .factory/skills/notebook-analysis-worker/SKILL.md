---
name: notebook-analysis-worker
description: Analyze handwritten notebook image batches into canonical extraction JSON with auditable ambiguity flags
---

# Notebook Analysis Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for features that:
- analyze JUAVIK notebook image batches
- convert source notebook pages into canonical extraction JSON
- audit extraction completeness, date/block handling, and ambiguity flags

## Required Skills

- `avileo` — invoke at the start for project/domain context and Avileo-specific conventions

## Work Procedure

1. Read the assigned feature, `mission.md`, mission `AGENTS.md`, and the notebook guidance under `data-avileo/instructions/` plus `.factory/library/notebook-data.md`.
2. Treat `data-avileo/extractions/JUAVIK/canonical/` as the only final output directory for this mission. Existing `pass-1/` and `pass-2/` files are reference-only.
3. For each assigned source image:
   - inspect the image
   - produce or update exactly one canonical JSON extraction
   - preserve raw evidence (`rawLineText`, markers, notes, confidence, review flags)
   - represent date/block complexity faithfully
4. If a sheet is structurally ambiguous, do a targeted second review of that sheet only and record the uncertainty explicitly in the canonical output.
5. Validate every created/updated canonical JSON by parsing it and checking required top-level/line-level fields.
6. Spot-check the most ambiguous sheets in the batch against the source image before finishing.
7. Do not normalize uncertainty away. If you cannot confidently classify a marker or line, keep the best-effort record flagged.
8. End with a handoff that includes counts, sampled ambiguous cases, and exact validation commands run.

## Example Handoff

```json
{
  "salientSummary": "Analyzed JUAVIK images 21-40 into canonical extraction JSON and validated the batch output. Preserved inherited-date cases and flagged ambiguous markers instead of forcing certainty. Spot-checked three conflicted sheets against source images before handing off.",
  "whatWasImplemented": "Created 20 canonical extraction JSON files under data-avileo/extractions/JUAVIK/canonical for images 21-40, including raw line evidence, block/date structure, payment-marker semantics, and review flags for ambiguous notebook content.",
  "whatWasLeftUndone": "Images 41-100 are still pending in later batch features.",
  "verification": {
    "commandsRun": [
      {
        "command": "python3 - <<'PY' ... validate batch JSON parse + required keys ... PY",
        "exitCode": 0,
        "observation": "All 20 canonical JSON files parsed successfully and had required top-level/line-level fields."
      },
      {
        "command": "python3 - <<'PY' ... compare expected image filenames to canonical outputs for 21-40 ... PY",
        "exitCode": 0,
        "observation": "No missing or duplicate canonical extraction files for the assigned batch."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened three flagged notebook images from the batch and compared inherited-date/payment-marker lines to the canonical JSON.",
        "observed": "The sampled sheets preserved raw line evidence and review flags for the ambiguous cases inspected."
      }
    ]
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": [
    {
      "severity": "medium",
      "description": "Customer spellings for two repeated names remain ambiguous across neighboring sheets and should be resolved during consolidation rather than extraction."
    }
  ]
}
```

## When to Return to Orchestrator

- Source images are unreadable enough that the batch cannot be completed best-effort
- Existing canonical outputs or guidance files contradict the mission guidance in a way that changes scope
- Completing the feature would require changing the target import semantics instead of only the extraction output

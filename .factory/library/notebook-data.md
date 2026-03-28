# Notebook Data

Mission-specific notebook extraction guidance that supersedes earlier double-pass assumptions when they conflict.

---

## Canonical Workflow
- Use **one canonical extraction pass** per sheet
- Perform a second review only for genuinely conflicted sheets or explicit audit samples
- Canonical extraction output directory: `data-avileo/extractions/JUAVIK/canonical/`

## Required Per-Sheet Behavior
- Preserve source image identity (`imageId`, `imageFile`)
- Preserve raw line evidence
- Preserve block/date structure
- Preserve ambiguity through `reviewFlags`, `notes`, and confidence
- Preserve semantic hints for `yapeo`, `xy` / `x yapear`, `NP`, `pago anterior`, `actual`, and unresolved markers like `P`, `H`, `CH`, `ND`

## Ambiguity Policy
- Best-effort interpretation is allowed
- Best-effort records must remain visibly flagged
- Ambiguous evidence must stay traceable into the consolidated dataset
- Nothing should be silently dropped without a review/report trail

## Legacy Pilot Outputs
- `data-avileo/extractions/JUAVIK/pass-1/` and `pass-2/` are pilot/reference artifacts from early exploration
- Workers may consult them for context, but they are not the final output of this mission

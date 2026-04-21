# T-001 Freeze Codegen Contract and Migration Target

## Objective

Define and lock the final generated SDK + hooks contract so implementation does not drift into complex domain-specific APIs.

## Requirements Covered

- `FR-010`

## Dependencies

- none

## Files or Areas Involved

- `.plans/drizzle-sync-codegen/requirements.md` - Modify - Capture final contract decisions and naming constraints.
- `.plans/drizzle-sync-codegen/context.md` - Modify - Record explicit migration boundaries.
- `packages/drizzle-sync/src/config/types.ts` - Review - Confirm generator metadata fields needed for SDK/hooks contract.
- `packages/backend/src/sync.config.ts` - Review - Confirm relation metadata supports generated local-first APIs.

## Actions

1. Define SDK method contract per supported entity shape (regular, child, junction).
2. Define generated hooks contract and query key conventions.
3. Define which legacy manual hooks remain wrappers and which migrate directly.
4. Capture explicit non-goals (no generated complex workflows).

## Completion Criteria

- SDK and hooks public contract is documented and unambiguous.
- Migration target matrix exists for each current manual hook domain.
- No unresolved ambiguity on business-scope injection behavior.

## Validation

- Manual review of contract against current generated outputs and manual hooks.
- Confirm requirements traceability in `task-index.md`.

## Risks or Notes

- Ambiguous naming decisions here cause broad churn later; lock this before code changes.

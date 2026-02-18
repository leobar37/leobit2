# Fix Asset/File Integration and Strategy

## Context

We are in the Avileo monorepo (offline-first sales system). This conversation analyzed the recently added `assets` and `files` feature to verify that the system uses shared abstractions instead of entity-specific implementations. The review covered backend schemas, APIs, services, repositories, frontend hooks/components, and integration boundaries.

## The Problem / Objective

Fix all detected issues in the current asset/file implementation and define a clear strategy so Product and related flows consistently use the shared `assets/files` model end-to-end.

## Key Decisions

- Treat this as a cross-layer consistency fix (DB + backend + frontend), not an isolated UI or API bug, because mismatches were found between schema, API contracts, and client flows.
- Prioritize security and correctness first: tenant isolation gaps in file access and missing product image persistence are the highest-risk problems.
- Define and implement one unified strategy for media handling (including business logo), avoiding special-case upload paths that bypass shared abstractions.

## Files Modified or Created

- `docs/plans/fix-assets-files-strategy.md` - Continuation context and objective document created from this conversation.
- No application source files were modified in this conversation (analysis-only).

## Next Step

Create a concrete implementation plan with ordered fixes (security first), starting by aligning product `imageId` handling across backend API/service/repository and then unifying remaining custom upload flows under the shared asset/file strategy.

---

Document generated from this conversation

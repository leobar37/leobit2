# Drizzle Sync Codegen (SDK + Hooks) Requirements

## Objective

Deliver a complete offline-first frontend codegen flow where generated SDK APIs are the primary data-access surface and generated React hooks are thin wrappers over that SDK. The generated output must make business scope implicit, keep CRUD simple, and allow domain-specific orchestration to be composed above generated primitives.

## Scope

- In scope:
  - Replace remote-first generated hooks with local-first SDK-backed hooks
  - Generate a pure SDK layer with basic CRUD and list/read operations
  - Add runtime/provider integration so SDK context is injected once
  - Support phased migration from manual hooks to generated hooks
  - Align sync payload contracts needed by generated local-first operations
- Out of scope:
  - Auto-generating complex domain workflows (draft/confirm/finalize, etc.)
  - Replacing TanStack Query
  - Replacing Zod validation model
  - Full backend domain redesign

## Functional Requirements

- `FR-001` - Generator MUST emit a pure SDK artifact (no React dependency) with entity-scoped APIs.
- `FR-002` - Generated SDK MUST provide basic operations per entity: `findById`, `findByBusiness` (or equivalent business-scoped list), `create`, `update`, and `delete` when valid for that entity.
- `FR-003` - Generated SDK mutations MUST be local-first: write to PGlite and enqueue sync operations.
- `FR-004` - Generated hooks MUST consume generated SDK APIs and MUST NOT perform direct API route mutations/queries for offline-first entities.
- `FR-005` - Business scope (tenant/business identity) MUST be implicit in SDK instance setup, not passed repeatedly by callers.
- `FR-006` - Generated hooks MUST expose TanStack Query-compatible patterns for list/detail queries and CRUD mutations.
- `FR-007` - Generated hooks MUST support predictable cache invalidation for relevant entity query keys after mutations.
- `FR-008` - Generator MUST preserve canonical naming rules: `entityType` in snake_case and payload business fields in camelCase.
- `FR-009` - Junction and child-entity behavior MUST remain safe: do not generate unsupported standalone APIs.
- `FR-010` - Generated APIs MUST remain intentionally simple; complex business operations are implemented as composition wrappers outside codegen.

## Non-Functional Requirements

- `NFR-001` - Generated SDK/hooks output MUST typecheck in `@avileo/app` without manual patching.
- `NFR-002` - Generator changes MUST preserve existing sync codec behavior (`currency`, `weight`, nullable handling) and Zod complement strategy.
- `NFR-003` - Migration MUST be incremental and non-breaking: manual hooks can coexist during transition.
- `NFR-004` - Runtime integration MUST avoid duplicated sync subscriptions or duplicated lifecycle start/stop side effects.
- `NFR-005` - Generated outputs MUST stay deterministic so `sync:generate` can be used in CI and code review reliably.

## Acceptance Criteria

- Running `bun run sync:generate` emits `sdk.ts` and `hooks.ts` where hooks call SDK methods rather than direct API routes.
- Generated SDK methods execute local-first writes + queue sync for mutations.
- At least one high-traffic domain (customers or products) is switched to generated hooks with no regression in offline behavior.
- Sales domain has a documented and implemented composition path for complex workflows using generated primitives where feasible.
- App build and targeted tests pass after integration.

## Constraints

- Keep comments in code in English only.
- Keep money/weight canonical representation as string.
- Keep Zod as validation boundary; codecs complement, not replace it.
- Do not collapse generated layer into complex domain-specific APIs.

## Open Questions

- Should generated hook naming map 1:1 to existing manual hook names for migration convenience, or use a new namespace and migrate imports gradually?
- Which complex manual hooks remain long-term wrappers vs. temporary migration adapters?
- Should generated cache invalidation rules be entirely generic per entity, or allow entity-specific override metadata in `sync.config.ts`?

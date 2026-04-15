# Offline Sales Performance Hardening Requirements

## Objective

Reduce latency in offline sales workflows so that creating and editing a sale feels immediate under real-world local data volumes, while preserving durability and eventual sync semantics.

## Scope

- In scope: frontend offline write path for sales, local sync outbox enqueue behavior, PGlite runtime strategy (worker/storage options), sales list/search query performance, instrumentation and verification.
- Out of scope: mandatory install-only product strategy, backend contract breakage, unrelated modules.

## Functional Requirements

- `FR-001` - Offline sales create/edit operations must continue to work in browser mode and installed PWA mode.
- `FR-002` - Draft sale creation must avoid redundant local reads/refetches in the critical path.
- `FR-003` - Sales editor mutations (customer/payment/items) must avoid broad invalidation and use narrow local state updates where feasible.
- `FR-004` - Sync outbox semantics must remain durable and resumable across refresh/reopen.
- `FR-005` - Sales list/search must support datasets in the order of thousands of rows without severe UI degradation.
- `FR-006` - The system must keep sync behavior resilient after refresh/reopen without manual recovery steps.

## Non-Functional Requirements

- `NFR-001` - P95 draft sale creation latency on representative Android Chrome devices must materially improve versus current baseline.
- `NFR-002` - UI interactivity during local DB operations must improve (reduced main-thread blocking/jank).
- `NFR-003` - No data loss introduced by performance optimizations beyond explicitly accepted durability tradeoffs.
- `NFR-004` - Changes must be measurable through instrumentation and repeatable validation steps.

## Acceptance Criteria

- A structured set of implementation tasks exists, covering hot-path optimizations, runtime architecture updates, and query/index improvements.
- Each task includes explicit validation criteria tied to performance or correctness outcomes.
- The plan preserves offline correctness constraints and does not rely on unsupported/experimental APIs for core guarantees.

## Constraints

- Android + Chrome/PWA is the primary runtime target.
- Offline-first is a hard requirement and cannot be removed.
- Background Sync and Periodic Background Sync are optional enhancements only.
- Existing durable queue model (`sync_operations`) must remain the source of truth for pending sync work.

## Open Questions

- Whether to enable `relaxedDurability` by default, behind feature flag, or per-runtime cohort.
- Whether to prioritize PGlite worker migration before queue fast-path refactor, or ship fast-path first for immediate wins.
- Final target thresholds for P50/P95 create/edit latency on the product's lowest-spec supported devices.

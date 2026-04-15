# Sync Performance Runbook (Operational Checklist)

Use this checklist when implementing, reviewing, or debugging sync-sensitive flows (especially sales POS).

## 1) Hot Path Design (Before Coding)

- [ ] Confirm operation is latency-critical (create draft, add/update/remove sale item, payment mode/customer edits).
- [ ] Keep local success path minimal: local write + durable outbox append.
- [ ] Use `syncGroupId` for related entities that must keep ordering.
- [ ] Prefer `fastPath: true` for critical enqueue paths.
- [ ] If operation is create-draft, use deterministic idempotency key (e.g. `sale:create:<id>`).
- [ ] Do not require network call for local success.

## 2) Query/Cache Behavior

- [ ] Avoid `small write -> broad invalidate -> full reread` in editor flows.
- [ ] Prefer local cache patch (`setQueryData`) for immediate UX.
- [ ] Invalidate list queries only when necessary.
- [ ] Keep list query shape/index strategy aligned with filters used by UI.

## 3) Resilience Guarantees

- [ ] Verify operation survives refresh/reopen (pending op remains in `sync_operations`).
- [ ] Verify sync resumes automatically after app restart.
- [ ] Ensure `startAutoSync()` kicks immediate `processPending()` (no full interval wait).
- [ ] Ensure backoff reset/recovery path works after reconnect.

## 4) Runtime Mode Safety

- [ ] Worker mode is behind `VITE_ENABLE_PGLITE_WORKER`.
- [ ] Direct PGlite fallback works when worker init fails.
- [ ] `relaxedDurability` tradeoff is understood and accepted for target runtime.
- [ ] No production deployment that hard-requires worker mode without staged validation.

## 5) Performance Instrumentation

- [ ] Perf logs are present for hot operations:
  - `[Perf][SaleService] ...`
  - `[Perf][SyncQueue] enqueue timing`
  - `[Perf][ServicesProvider] startup`
  - `[Perf][EngineProvider] initDatabase`
- [ ] Capture baseline and post-change P50/P95 for key actions.
- [ ] Validate on representative Android Chrome devices (not desktop only).

## 6) Regression Checks

- [ ] Create draft sale while offline.
- [ ] Refresh page before sync.
- [ ] Reopen and reconnect.
- [ ] Confirm pending ops sync successfully.
- [ ] Confirm no duplicate creates (idempotency behavior).
- [ ] Confirm grouped operations preserve order (parent before child).

## 7) Escalation Triggers

Escalate before rollout if any of these occur:

- [ ] Queue grows continuously (`pending` increases without drain).
- [ ] Repeated dead-letter growth for same entity/flow.
- [ ] Pull gets stuck repeatedly (`isStuck=true`) under normal connectivity.
- [ ] Create-draft/editor latency regresses above accepted threshold.
- [ ] Worker mode causes startup instability in target devices.

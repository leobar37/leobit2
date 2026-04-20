# User Testing

**What belongs here:** Testing surface findings, required tools, resource cost classification.

---

## Validation Surface

This mission validates through **code-level surfaces** (not browser UI):

| Surface | Tool | What It Tests |
|---------|------|---------------|
| Build | `bun run build` | All packages compile |
| Typecheck | `bun run typecheck` | TypeScript type safety |
| Unit Tests | `bun test --run` | Service behavior, sync ordering |
| Generated Code | File inspection | Generator output correctness |
| Integration | Custom tests | End-to-end sync flows |

## Required Testing Skills/Tools

- **No browser automation** needed (backend/infrastructure mission)
- **CLI commands** for validation
- **File reading** for generated code inspection
- **Unit test framework:** Vitest (both packages)

## Resource Cost Classification

| Surface | Cost | Max Concurrent | Rationale |
|---------|------|---------------|-----------|
| Build | Low | 5 | ~8s total, low memory |
| Typecheck | Low | 5 | ~9s total, moderate memory |
| Unit Tests | Low | 5 | Backend ~0.5s, App ~6s |
| Generator | Low | 5 | ~3s, low memory |

**Overall:** LOW resource cost. Machine has 12 cores and 24 GB RAM. All validation commands complete in <10s. No heavy processes spawned.

## Isolation Strategy

- Tests are stateless (use mocks, not real DB)
- No shared services between validators
- Each validator runs commands independently
- No port conflicts (no long-running services)

## Known Limitations

- **No E2E tests:** Cannot run against real DB (no Docker/Postgres locally, Neon too heavy)
- **Pre-existing test failures:** Some app tests fail before mission starts (calculator, date formatting, device fingerprinting). Validators should not fix these.
- **Backend race tests:** 3 pre-existing failures in `sale-sync.race.test.ts`

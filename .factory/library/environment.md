# Environment

Environment variables, external dependencies, and setup notes for the JUAVIK notebook-to-seed mission.

**What belongs here:** Required env vars, external services, setup assumptions, dependency quirks.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Runtime
- Bun is required at the repo root and in workspace packages
- The backend environment is read from `packages/backend/.env`
- This mission assumes the configured database remains available and usable for non-destructive import validation

## External / Shared Dependencies
- Existing local Redis on `6379` is reused
- Existing Better Auth setup is reused through the backend seed path
- Existing account target is `cliente1@gmail.com`

## Mission-Specific Assumptions
- Raw notebook images are immutable source artifacts under `data-avileo/JUAVIK/`
- Canonical extraction outputs live under `data-avileo/extractions/JUAVIK/canonical/`
- Consolidated import JSON should live under `data-avileo/consolidated/`
- Existing pilot `pass-1/` and `pass-2/` extraction directories are reference-only and should not be treated as final mission outputs
- Avoid DB reset flows unless a future feature explicitly authorizes them

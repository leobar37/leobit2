# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Runtime
- Bun 1.1.38+ required
- No Docker or PostgreSQL needed for this mission (typecheck/lint only validation)

## Dependencies
- `bun install` at repo root installs all workspace packages
- Frontend: packages/app (React Router v7 + Vite)
- Backend: packages/backend (ElysiaJS + Drizzle)
- Shared: packages/shared (tsup build)

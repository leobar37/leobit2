# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Database

- PostgreSQL on localhost:5432
- Drizzle ORM for schema and queries

## Auth

- Better Auth for JWT sessions
- businessId extracted from request context

## Sync

- ElectricSQL for offline sync
- All tables have syncStatus + syncAttempts columns

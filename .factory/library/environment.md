# Environment

## Environment Variables

### Backend (`packages/backend/.env`)
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — JWT secret for auth
- `PORT` — API server port (default: 3100)

### Frontend (`packages/app/.env`)
- `VITE_API_URL` — Backend API URL
- No additional env vars needed for sync

### Test
- `DATABASE_URL` must contain "test" for backend E2E tests
- `.env.test` loaded by `packages/backend/tests/e2e/setup.ts`

## External Dependencies
- PostgreSQL (Neon or local) — required for backend
- Bun 1.1.38+ — runtime
- Node.js — not required (Bun is primary)

## Dependency Quirks
- `drizzle-sync` must be built before backend/app can import it
- `shared` must be built before other packages
- PGlite is a peer dependency (optional) — only needed for frontend
- React is a peer dependency (optional) — only needed for frontend hooks

## Platform Notes
- macOS development environment
- Docker available but not required (PostgreSQL can be local)
- No Redis needed for this mission

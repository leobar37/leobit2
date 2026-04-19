# User Testing

## Validation Surface

### Browser (agent-browser)
- Primary surface for frontend validation
- Mobile viewport (Pixel 5, 393x851)
- Tests CRUD operations, offline sync, conflict resolution

### API (curl)
- Backend sync endpoint validation
- `POST /sync/batch` with operation batches
- `GET /sync/changes` for pull validation

### Terminal (tuistory)
- Not used for this mission (no CLI features being built)

## Required Testing Skills/Tools
- `agent-browser` for frontend validation
- `avileo-sync` for sync-specific test patterns
- `frontend` for React component testing

## Resource Cost Classification

### agent-browser
- Each instance: ~300 MB RAM
- Dev server: ~200 MB RAM
- Machine: 18 GB RAM, 12 CPU cores
- Baseline usage: ~6 GB
- Usable headroom: ~8.4 GB (70% of 12 GB)
- Max concurrent validators: **5**

### Backend Tests
- Each instance: ~500 MB RAM (includes DB connection)
- Max concurrent: **3**

## Isolation Strategy
- Backend tests use test database (DATABASE_URL must contain "test")
- Frontend tests use jsdom + MSW mocks
- E2E tests require manually started dev servers
- Playwright tests run sequentially (1 worker)

## Setup Notes
- Dev servers must be running for E2E: `bun run dev`
- Demo user must be seeded: `cd packages/backend && bun run db:seed:demo`
- PGlite initializes automatically in browser
- Backend E2E requires `.env.test` with test DATABASE_URL

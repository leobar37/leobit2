# Environment

**What belongs here:** Required env vars, external dependencies, setup notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Environment Variables

### Backend (`packages/backend/.env`)
```bash
DATABASE_URL=postgresql://... (Neon DB)
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
S3_BUCKET_NAME=...
```

### App (`packages/app/.env`)
```bash
VITE_API_URL=http://localhost:3000
```

## External Dependencies

| Service | Purpose | Notes |
|---------|---------|-------|
| Neon PostgreSQL | Production database | URL in env, NOT used for E2E tests |
| AWS S3 | File storage | For image uploads |
| Redis | Cache/queue | Port 6379, belongs to another project — DO NOT TOUCH |

## Local Development Notes

- **No Docker available:** Cannot run PostgreSQL locally. Use unit tests with mocks.
- **No E2E against Neon:** Too heavy. Validation via unit tests + typecheck only.
- **Bun runtime:** All commands use `bun`, not `npm` or `yarn`.
- **Workspace packages:** `@avileo/shared`, `@avileo/drizzle-sync`, `@avileo/backend`, `@avileo/app`

## Platform Notes

- macOS 25.2.0 (Darwin)
- 12 CPU cores, 24 GB RAM
- Memory pressure observed (compressor active) — monitor during heavy operations

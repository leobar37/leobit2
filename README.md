# Avileo

Offline-first chicken sales management system.

## Requirements
- Bun 1.1.38+
- Node.js 20+

## Quick Start
```bash
bun install
cp .env.example .env
# Add your Neon DATABASE_URL
bun run dev
```

## Project Structure
```
packages/
├── backend/    # ElysiaJS + Drizzle + Neon
├── app/        # React Router v7 frontend
└── shared/     # Shared types (tsup build)
```

## Scripts
- `bun run dev` - Start dev servers
- `bun run build` - Build all packages
- `bun run db:migrate` - Run database migrations

## Documentation
See `/docs/` for detailed documentation.

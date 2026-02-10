# AGENTS

## Available Skills
- `skill(name="bun-elysia")` - Backend patterns with ElysiaJS
- `skill(name="frontend")` - React/TanStack patterns  
- `skill(name="fullstack-infrastructure")` - Monorepo patterns

## Conventions
- Backend: `packages/backend/src/`
- Frontend routes: `packages/app/app/routes/`
- Shared types: `packages/shared/src/`
- Database: Neon PostgreSQL with Drizzle ORM
- Imports: Use `@avileo/shared` for workspace packages

## Architecture
- Monorepo: Bun + Turborepo
- Offline-first with TanStack DB (Phase 2)
- Stack: Bun, Elysia, Drizzle, React Router v7, TanStack

## Patterns
- Add API route: Create file in `packages/backend/src/`
- Add frontend route: Create file in `packages/app/app/routes/`
- Add shared types: Export from `packages/shared/src/index.ts`

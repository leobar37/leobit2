# AGENTS.md - Mission: Visitas + Grupos de Clientes

## Mission Boundaries

- **Port Range**: 3000-3100 (backend: 3000, frontend: 5173)
- **Database**: Use existing PostgreSQL on localhost:5432
- **Off-limits**: Don't modify existing sales/distribution logic

## Working Directory

All work happens in `/Users/leobar37/.supacode/repos/avileo/feature/visitas`

## Commands

```bash
# Backend development
cd packages/backend && bun run dev

# Database migrations
bun run db:generate
bun run db:migrate

# TypeScript check
bun run build

# Frontend development  
cd packages/app && bun run dev
```

## Key Patterns

### Offline-First Schema Pattern

All new tables MUST have:
```typescript
businessId: uuid("business_id").notNull().references(() => businesses.id),
syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
syncAttempts: integer("sync_attempts").notNull().default(0),
```

### Repository Pattern

Follow existing pattern from `CustomerRepository`:
- ctx as FIRST parameter
- businessId filtering on ALL queries
- RequestContext type from context plugin

### Frontend Patterns

- Use existing UI components (Card, Button, AppDrawer)
- Follow file-based routing in `app/routes/`
- Use TanStack Query for data fetching
- Offline-first: check isOnline() before API calls

## Language

- Code comments: English only
- User-facing text: Spanish (es-PE)

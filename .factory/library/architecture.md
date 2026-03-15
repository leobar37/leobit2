# Architecture

Architectural decisions and patterns for this mission.

## Offline-First Tables

All new tables follow this pattern:

```typescript
businessId: uuid("business_id")
  .notNull()
  .references(() => businesses.id),
syncStatus: syncStatusEnum("sync_status")
  .notNull()
  .default("synced"),
syncAttempts: integer("sync_attempts")
  .notNull()
  .default(0),
```

## API Pattern

- RESTful endpoints using ElysiaJS
- All routes require businessId from context
- Error handling via domain errors (NotFoundError, ValidationError)

## Frontend Pattern

- React Router v7 with file-based routing
- TanStack Query for server state
- Offline-first: check isOnline() before API calls

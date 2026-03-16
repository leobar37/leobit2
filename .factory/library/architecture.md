# Architecture

Architectural decisions, patterns discovered, and constraints.

---

## Sync Architecture
- **Push (client→server):** Custom SyncService with operation queue in PGlite → batches to POST /sync/batch
- **Pull (server→client):** Custom PullService with cursor-based polling from GET /sync/changes → UPSERT locally
- **ElectricSQL:** PGlite (WASM Postgres) used as local DB. Electric sync extension loaded but NOT used at runtime — all sync is custom.
- **Conflict resolution:** Only customers (timestamp) and sales (version) have real conflict detection. All others use NoOp (last-write-wins).
- **Idempotency:** Backend uses unique (business_id, operation_id) on sync_operations table. Frontend uses idempotency_key per operation.
- **Retry:** Max 5 retries with exponential backoff (base 1s, max 30s). Dead Letter Queue for exhausted operations.
- **Self-healing:** Failed update converts to insert for sales/customers (and after fixes, for new entities too).

## Key Patterns
- **RequestContext:** `ctx` MUST be first parameter in all backend repo/service methods
- **Multi-tenancy:** ALL queries MUST filter by `ctx.businessId`
- **Single Decorate:** Use ONE `.decorate()` call in Elysia routes
- **syncGroupId:** Related operations (sale + items) share a group ID and are sent together
- **Entity services:** Frontend services wrap PGlite operations + sync queue
- **BaseService:** All frontend entity services extend BaseService which provides queueSync(), businessId, etc.

## PGlite Local Schema
- Tables created via raw SQL in `engine/db.ts` `createTables()`
- No FK constraints in PGlite (allows any insertion order)
- SCHEMA_VERSION controls migration — bump forces recreate with data export/import
- Sync status tracked per-row (`sync_status`, `sync_attempts` columns)

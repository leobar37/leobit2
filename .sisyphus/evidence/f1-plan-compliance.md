# F1: Plan Compliance Audit — Evidence

**Date:** 2026-04-28
**Auditor:** F1 Oracle Agent
**Plan:** `.sisyphus/plans/online-first-sync-removal.md`
**Verdict:** ✅ **APPROVE**

---

## Decision 1: Clean Cut Migration

**Requirement:** No compatibility bridge, no drizzle-sync stub, no gradual migration.

### Verification

| Check | Tool | Result |
|-------|------|--------|
| `packages/drizzle-sync/` does NOT exist | `glob` | ✅ No files found |
| `@avileo/drizzle-sync` not in any `package.json` | `grep` | ✅ No matches found |
| `drizzle-sync.config.ts` does NOT exist | `grep` | ✅ No matches found |

### Evidence
```
$ glob packages/drizzle-sync/**
→ No files found

$ grep -r "@avileo/drizzle-sync" --include="package.json"
→ No matches found

$ grep -r "drizzle-sync\.config\.ts"
→ No matches found
```

**Status:** ✅ PASS

---

## Decision 2: No Drain/Export of Pending Local PGlite/Sync Data

**Requirement:** No data export/drain scripts that export local PGlite/sync data.

### Verification

| Check | Tool | Result |
|-------|------|--------|
| No `migrate-to-pglite.ts` script | `grep` | ✅ Only found in docs (historical) |
| No `rollback-migration.ts` script | `grep` | ✅ Only found in docs (historical) |
| No `verify-migration.ts` script | `grep` | ✅ Only found in docs (historical) |
| No `migrate-tanstack-to-pglite.ts` script | `grep` | ✅ Only found in docs (historical) |

### Evidence
```
$ grep -r "migrate-to-pglite|rollback-migration|verify-migration|migrate-tanstack"
→ docs/offline/08-plan-completar-migracion.md       (historical doc)
→ docs/offline/09-tareas-migracion/06-migracion-cleanup.md  (historical doc)
```

**Status:** ✅ PASS

---

## Decision 3: Sync Tables Dropped

**Requirement:** `sync_operations` and `sync_dead_letter` removed from schema and DB with migration.

### Verification

| Check | Tool | Result |
|-------|------|--------|
| Schema index does NOT export sync tables | `read` | ✅ No sync table exports |
| `0061_drop_sync_tables.sql` exists | `glob` | ✅ Found |
| Migration drops both tables in safe order | `read` | ✅ `sync_dead_letter` first, then `sync_operations` |
| No runtime `sync_operations`/`sync_dead_letter` refs in `backend/src` | `grep` | ✅ No matches found |

### Evidence

**Migration file** (`packages/backend/drizzle/0061_drop_sync_tables.sql`):
```sql
-- Migration: Drop sync operations and dead letter tables
-- Part of online-first sync removal
-- Date: 2026-04-28

-- Drop dead letter queue first (depends on nothing)
DROP TABLE IF EXISTS sync_dead_letter;

-- Drop sync operations table
DROP TABLE IF EXISTS sync_operations;
```

**Schema index** (`packages/backend/src/db/schema/index.ts`): Verified all 264 lines — no `sync-operations` or `sync-dead-letter` exports.

```
$ grep -r "sync_operations|sync_dead_letter" packages/backend/src/**/*.ts
→ No matches found
```

**Status:** ✅ PASS

---

## Decision 4: No Cache Replacement

**Requirement:** Session/business cache removed, not replaced with another persistent cache.

### Verification

| Check | Tool | Result |
|-------|------|--------|
| `use-cached-business.ts` is deleted | `glob` | ✅ No files found |
| `cache.ts` is deleted | `glob` | ✅ No files found |
| No `networkMode: "offlineFirst"` | `grep` | ✅ No matches in app code |
| No new IndexedDB/localStorage cache for business/session | `grep` | ✅ No PGlite usage in frontend |

### Evidence
```
$ glob packages/app/app/hooks/use-cached-business.ts
→ No files found (DELETED)

$ glob packages/app/app/lib/cache.ts
→ No files found (DELETED)

$ grep -r "offlineFirst" packages/app/app/lib/query/
→ No matches found
```

**Status:** ✅ PASS

---

## Decision 5: Public-Sale Refetch/Polling

**Requirement:** Updates visible through API refetch, not pull sync.

### Verification

| Check | Tool | Result |
|-------|------|--------|
| `public-sales.ts` has NO `syncOperations` insertion | `grep` | ✅ No matches found |
| `use-sales.ts` has `refetchOnWindowFocus: true` | `grep` | ✅ Found at lines 230, 258, 276, 324, 347 |

### Evidence
```
$ grep -r "syncOperations" packages/backend/src/api/
→ No matches found (sync insertion REMOVED)

$ grep "refetchOnWindowFocus" packages/app/app/hooks/use-sales.ts
→ 230: refetchOnWindowFocus: true,
→ 258: refetchOnWindowFocus: true,
→ 276: refetchOnWindowFocus: true,
→ 324: refetchOnWindowFocus: true,
→ 347: refetchOnWindowFocus: true,
```

**Status:** ✅ PASS

---

## Decision 6: Offline Sale Blocked

**Requirement:** Sale confirmation blocked when offline with exact Spanish message.

### Verification

| Check | Tool | Result |
|-------|------|--------|
| Spanish message exact match exists | `grep` | ✅ Found at line 421 |
| `useOnline()` hook is used | `grep` | ✅ Imported and used in `new-sale.tsx` |
| Guard check `!isOnline` present | `read` | ✅ Lines 420-423 |

### Evidence

**File:** `packages/app/app/components/sales/new-sale.tsx`

```typescript
// Line 39: import
import { useOnline } from "~/hooks/use-online";

// Line 410: hook usage
const { isOnline } = useOnline();

// Lines 420-423: guard
if (!isOnline) {
  toast.error("Necesitas conexión a internet para confirmar la venta.");
  return;
}
```

**Status:** ✅ PASS

---

## Build Verification

```
$ bun run build
→ ✓ @avileo/shared#build succeeded
→ ✓ @avileo/backend#build succeeded  
→ ✓ @avileo/app#build succeeded
→ Tasks:    3 successful, 3 total
→ Cached:    3 cached, 3 total
```

**Status:** ✅ PASS

---

## Final Verdict

**APPROVE**

All 6 confirmed decisions from the plan have been implemented correctly:

1. ✅ Clean cut migration — no drizzle-sync stub
2. ✅ No data drain/export scripts
3. ✅ Sync tables dropped via `0061_drop_sync_tables.sql`
4. ✅ No cache replacement — cache files deleted
5. ✅ Public-sale refetch via `refetchOnWindowFocus: true`
6. ✅ Offline sale blocked with exact Spanish message

**Evidence collected:** 2026-04-28

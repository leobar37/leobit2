# T-001: DB Migration - Remove modo columns

**Status:** pending  
**Priority:** P0 (Blocking)  
**Est. Time:** 2-3 hours  
**Requirements:** FR-001, FR-005, NFR-004  

## Description
Remove all mode-related columns from the database schema. This includes:
- `modo` from `distribuciones` table
- `modoDistribucion` from `businesses` table

## Files to Modify

### 1. Schema Definition
**File:** `packages/backend/src/db/schema/inventory.ts`

**Changes:**
```typescript
// REMOVE (line 99):
modo: varchar("modo", { length: 20 }).notNull().default("estricto"),

// REMOVE (line 118):
index("idx_distribuciones_modo").on(table.modo),
```

**File:** `packages/backend/src/db/schema/businesses.ts`

**Changes:**
```typescript
// REMOVE (line 49):

// REMOVE (line 52):
modoDistribucion: varchar("modo_distribucion", { length: 20 }).default("estricto"),
```

### 2. Enums
**File:** `packages/backend/src/db/schema/enums.ts`

**Changes:**
```typescript
// REMOVE (lines 64-69):
  "inventario_propio",
  "sin_inventario",
  "pedidos",
  "mixto",
]);
```

### 3. Migration File
**File:** `packages/backend/drizzle/00XX_remove_modo_columns.sql` (new)

**Migration SQL:**
```sql
-- Remove modo column from distribuciones
ALTER TABLE distribuciones DROP COLUMN IF EXISTS modo;

-- Remove modo columns from businesses
ALTER TABLE businesses DROP COLUMN IF EXISTS modo_distribucion;

-- Drop enum type (optional - only if not referenced elsewhere)
```

## Implementation Steps

1. **Generate migration:**
   ```bash
   cd packages/backend
   bun run db:generate
   ```

2. **Verify migration file:** Check the generated SQL in `drizzle/` folder

3. **Test migration locally:**
   ```bash
   bun run db:migrate
   ```

4. **Verify schema.ts types:** Ensure TypeScript types are updated after migration

## Rollback Plan

**Rollback SQL:**
```sql
-- Add columns back (for emergency rollback)
ALTER TABLE distribuciones ADD COLUMN modo varchar(20) DEFAULT 'libre';
ALTER TABLE businesses ADD COLUMN modo_distribucion varchar(20) DEFAULT 'libre';
```

## Verification Checklist

- [ ] Migration generates without errors
- [ ] Migration applies successfully
- [ ] `distribuciones.modo` column removed
- [ ] `businesses.modoDistribucion` column removed
- [ ] TypeScript types updated (no modo references)
- [ ] drizzle-kit generate produces valid SQL

## Dependencies

**Blocks:** T-002, T-003, T-007, T-011  
**Depends on:** None

## Notes

- This is a **destructive migration** - data in modo columns will be lost
- Since modo was hardcoded to "libre" in UI, all recent data should already be "libre"
- Backup database before running in production

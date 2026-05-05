# T-011: Data Migration - Existing distribuciones

**Status:** pending  
**Priority:** P1  
**Est. Time:** 1 hour  
**Requirements:** FR-005, NFR-004  

## Description
Migrate existing distribution data to work with the new simplified system. Since the UI was hardcoded to "libre" mode, most recent data should already be compatible.

## Migration Strategy

### Option A: No-op Migration (Recommended)

Since the modo column is being **dropped** and:
1. The UI has been hardcoded to "libre" for a while
2. New code doesn't reference modo
3. The column removal is backward compatible (code doesn't break if column exists)

**Simply run T-001 migration** and existing data is fine.

### Option B: Data Transformation (If Needed)

If some distributions exist with modo="estricto" or "acumulativo":

**Migration script:**
```sql
-- Check existing modo distribution
SELECT modo, COUNT(*) 
FROM distribuciones 
GROUP BY modo;

-- If non-libre modes exist, handle them:
-- Option: Convert estricto/acumulativo to libre
UPDATE distribuciones 
SET modo = 'libre' 
WHERE modo IN ('estricto', 'acumulativo');
```

### Option C: Business Logic Migration (If Complex)

If distributions with modo="estricto" have active stock reservations:

**Steps:**
1. Before migration, identify affected distributions
2. For each active estricto distribucion:
   - Record current stock reservations
   - Ensure inventory reflects reality
   - Manually reconcile if needed
3. Run column removal migration
4. Verify data consistency

## Pre-Migration Check

Run this query to assess data:
```sql
-- Check modo distribution
SELECT 
  modo, 
  COUNT(*) as count,
  COUNT(CASE WHEN estado = 'activo' THEN 1 END) as active_count
FROM distribuciones 
GROUP BY modo;

-- Check if any businesses use non-default modos
SELECT 
  modo_distribucion, 
  COUNT(*) 
FROM businesses 
```

## Migration File

**File:** `packages/backend/drizzle/00XX_remove_modo_columns.sql` (from T-001)

**Add data check comment:**
```sql
-- Migration: Remove modo columns
-- 
-- Pre-migration check (run manually):
-- SELECT modo, COUNT(*) FROM distribuciones GROUP BY modo;
-- 
-- If non-libre modes exist, evaluate Option B or C

-- Remove modo column from distribuciones
ALTER TABLE distribuciones DROP COLUMN IF EXISTS modo;

-- Remove modo columns from businesses
ALTER TABLE businesses DROP COLUMN IF EXISTS modo_distribucion;

-- Drop enum type
```

## Rollback Plan

If migration causes issues:

```sql
-- Emergency rollback
ALTER TABLE distribuciones ADD COLUMN modo varchar(20) DEFAULT 'libre';
ALTER TABLE businesses ADD COLUMN modo_distribucion varchar(20) DEFAULT 'libre';
```

## Implementation Steps

1. **Run pre-migration check query**
2. **Assess if any action needed**
3. **Choose migration option (likely A - no-op)**
4. **Run T-001 migration**
5. **Verify data integrity**

## Verification Checklist

- [ ] Pre-migration check run
- [ ] modo distribution assessed
- [ ] Migration option chosen
- [ ] Migration applied successfully
- [ ] Data integrity verified
- [ ] Rollback procedure documented

## Dependencies

**Blocks:** None (run in production after deployment)  
**Depends on:** T-001

## Notes

- This is likely a no-op migration since modo was already hardcoded
- Run pre-migration check to confirm
- Have rollback ready just in case
- Verify after deployment

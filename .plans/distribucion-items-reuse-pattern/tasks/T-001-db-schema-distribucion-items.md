# T-001: DB Schema - Create distribucion_items Table

**Status:** pending  
**Priority:** P0  
**Est. Time:** 1 hour  
**Requirements:** FR-001  
**Depends on:** None  
**Blocks:** T-002, T-004

## Description
Create the database table for distribucion items following the same pattern as sale_items and purchase_items.

## Schema Design

```sql
CREATE TABLE distribucion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  distribucion_id UUID NOT NULL REFERENCES distribuciones(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  cantidad_asignada DECIMAL(10,3) NOT NULL DEFAULT 0,
  cantidad_vendida DECIMAL(10,3) NOT NULL DEFAULT 0,
  unidad VARCHAR(20) NOT NULL DEFAULT 'kg',
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_group_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_distribucion_items_distribucion_id ON distribucion_items(distribucion_id);
CREATE INDEX idx_distribucion_items_business_id ON distribucion_items(business_id);
CREATE INDEX idx_distribucion_items_variant_id ON distribucion_items(variant_id);
CREATE INDEX idx_distribucion_items_sync ON distribucion_items(sync_status, sync_attempts);

-- Electric replication
COMMENT ON TABLE distribucion_items IS '50000000-0000-0000-0000-000000000001';
```

## Files to Modify

1. **packages/backend/src/db/schema/inventory.ts**
   - Add distribucionItems table definition
   - Add relations

2. **packages/backend/drizzle/00XX_create_distribucion_items_table.sql**
   - Migration file

## Implementation Notes

- Follow exact same structure as purchase_items
- Use DECIMAL for quantities (same as sales)
- Include sync_group_id for atomic operations
- Add Electric comment for replication

## Verification Checklist

- [ ] Table created successfully
- [ ] Indexes created
- [ ] Foreign keys with cascade delete
- [ ] Electric replication enabled
- [ ] Migration runs without errors

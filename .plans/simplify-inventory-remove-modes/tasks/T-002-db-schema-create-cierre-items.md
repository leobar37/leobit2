# T-002: DB Schema - Create cierre items table

**Status:** pending  
**Priority:** P0  
**Est. Time:** 1-2 hours  
**Requirements:** FR-003  

## Description
Create a new table `distribucion_cierre_items` to store the products registered when a vendor closes a distribution. This replaces the concept of pre-assigned distribution items with close-time registration.

## Files to Modify

### 1. Schema Definition
**File:** `packages/backend/src/db/schema/inventory.ts`

**Add after distribucionItems (around line 161):**
```typescript
// Distribution close items - registered by vendor when closing
export const distribucionCierreItems = pgTable(
  "distribucion_cierre_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenancy
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),

    // Relations
    distribucionId: uuid("distribucion_id")
      .notNull()
      .references(() => distribuciones.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),

    // Vendor-reported quantities at close time
    cantidadLlevada: decimal("cantidad_llevada", { precision: 10, scale: 3 }).notNull(),
    cantidadVendida: decimal("cantidad_vendida", { precision: 10, scale: 3 }).notNull(),
    cantidadDevuelta: decimal("cantidad_devuelta", { precision: 10, scale: 3 }).notNull().default("0"),

    // Calculated field
    montoVentas: decimal("monto_ventas", { precision: 12, scale: 2 }),

    // Sync status for offline-first
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cierre_items_business_id").on(table.businessId),
    index("idx_cierre_items_distribucion_id").on(table.distribucionId),
    index("idx_cierre_items_variant_id").on(table.variantId),
    index("idx_cierre_items_sync_status").on(table.syncStatus),
    uniqueIndex("idx_cierre_items_unique").on(table.distribucionId, table.variantId),
  ]
);
```

**Add type exports (after line 241):**
```typescript
export type DistribucionCierreItem = typeof distribucionCierreItems.$inferSelect;
export type NewDistribucionCierreItem = typeof distribucionCierreItems.$inferInsert;
```

**Add relations (after line 282):**
```typescript
export const distribucionCierreItemsRelations = relations(distribucionCierreItems, ({ one }) => ({
  business: one(businesses, {
    fields: [distribucionCierreItems.businessId],
    references: [businesses.id],
  }),
  distribucion: one(distribuciones, {
    fields: [distribucionCierreItems.distribucionId],
    references: [distribuciones.id],
  }),
  variant: one(productVariants, {
    fields: [distribucionCierreItems.variantId],
    references: [productVariants.id],
  }),
}));
```

**Update distribuciones relations (line 252):**
```typescript
export const distribucionesRelations = relations(distribuciones, ({ one, many }) => ({
  // ... existing relations ...
  items: many(distribucionItems),
  cierreItems: many(distribucionCierreItems), // ADD this
  sales: many(sales),
}));
```

## Implementation Steps

1. **Add schema definition** to `inventory.ts`
2. **Generate migration:**
   ```bash
   cd packages/backend
   bun run db:generate
   ```
3. **Apply migration:**
   ```bash
   bun run db:migrate
   ```

## Verification Checklist

- [ ] Table `distribucion_cierre_items` created
- [ ] All indexes created
- [ ] Foreign key constraints defined
- [ ] TypeScript types exported
- [ ] Relations defined
- [ ] Migration applies successfully

## Dependencies

**Blocks:** T-009  
**Depends on:** T-001

## Notes

- The `cantidadDevuelta` can be calculated (llevada - vendida) but storing it allows vendor corrections
- `montoVentas` is calculated from sales but stored for quick reporting
- Unique constraint on (distribucionId, variantId) prevents duplicate entries

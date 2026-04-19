# T-008: Backend Integration

## Objective

Create the sync.config.ts file in backend and wire up all code generation.

## Requirements

**From**: FR-008

## Implementation Details

### Files to Create/Modify

1. `packages/backend/src/sync.config.ts` (NEW)
   - Define all syncable entities
   - Configure relations
   - Set up hybrid field definitions

2. `packages/backend/package.json` (MODIFY)
   - Add sync:generate script
   - Add sync:validate script

### Config File Structure

```typescript
// packages/backend/src/sync.config.ts
import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import { 
  customers, 
  sales, 
  saleItems,
  products,
  purchases,
  purchaseItems,
  suppliers,
  payments,
} from "./db/schema";

export const syncConfig = defineSyncConfig({
  entities: {
    // Customers - simple entity, auto all fields
    customers: {
      table: customers,
      syncable: true,
      priority: 1,
      conflictResolver: "version-based",
    },
    
    // Products - auto fields but exclude some
    products: {
      table: products,
      syncable: true,
      priority: 1,
      autoFields: true,
      excludeFields: ["cost_price"], // Don't sync cost to client
      conflictResolver: "version-based",
    },
    
    // Sales - parent entity with children
    sales: {
      table: sales,
      syncable: true,
      priority: 1,
      conflictResolver: "version-based",
      relations: {
        items: {
          entity: "saleItems",
          foreignKey: "sale_id",
          cascade: true,
        }
      },
    },
    
    // Sale Items - child entity
    saleItems: {
      table: saleItems,
      syncable: true,
      priority: 2, // After sales
      conflictResolver: "version-based",
    },
    
    // Purchases - parent entity
    purchases: {
      table: purchases,
      syncable: true,
      priority: 1,
      conflictResolver: "version-based",
      relations: {
        items: {
          entity: "purchaseItems",
          foreignKey: "purchase_id",
          cascade: true,
        }
      },
    },
    
    // Purchase Items - child entity
    purchaseItems: {
      table: purchaseItems,
      syncable: true,
      priority: 2,
      conflictResolver: "version-based",
    },
    
    // Suppliers - simple entity
    suppliers: {
      table: suppliers,
      syncable: true,
      priority: 1,
      conflictResolver: "version-based",
    },
    
    // Payments (abonos)
    payments: {
      table: payments,
      syncable: true,
      priority: 1,
      conflictResolver: "version-based",
    },
  },
  
  options: {
    batchSize: 50,
    maxRetries: 3,
  },
});

export default syncConfig;
```

### Package.json Scripts

```json
{
  "scripts": {
    "sync:generate": "bun run --filter @avileo/drizzle-sync sync:generate --config ./src/sync.config.ts",
    "sync:validate": "bun run --filter @avileo/drizzle-sync sync:validate --config ./src/sync.config.ts",
    "sync:diff": "bun run --filter @avileo/drizzle-sync sync:diff --config ./src/sync.config.ts",
    "sync:clean": "bun run --filter @avileo/drizzle-sync sync:clean --config ./src/sync.config.ts"
  }
}
```

## Acceptance Criteria

- [ ] Create sync.config.ts with all 14 entities
- [ ] Configure parent-child relations (sales/items, purchases/items)
- [ ] Set appropriate priorities (parents=1, children=2)
- [ ] Configure conflict resolvers per entity
- [ ] Add npm scripts to backend package.json
- [ ] Test config loads without errors
- [ ] Test generation produces valid output

## Testing Strategy

1. Load config and validate structure
2. Run generation and check output
3. Verify all entities are covered
4. Check relation graph is correct

## Dependencies

- T-002: CLI Tool (needs command infrastructure)
- T-004: Zod Generator (to test generation)
- T-005: DDL Generator (to test generation)
- T-006: Applier Generator (to test generation)
- T-013: Relation Detection (to test cascade config)

## Estimated Time

2 hours

## Notes

- This is the integration point - everything comes together here
- Must cover all 14 existing sync entities
- Relations must be correctly configured
- Test with actual bun run sync:generate

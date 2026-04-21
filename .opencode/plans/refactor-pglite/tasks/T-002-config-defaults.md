# T-002: Create Config Defaults

## Objective
Extract hardcoded configuration values from change-applier and other files into a centralized config module.

## Requirements Addressed
- Partial: FR-004 (REQUIRED_COLUMN_DEFAULTS extraction)

## Files to Create/Modify

### Create
- `packages/drizzle-sync/src/pglite/config/defaults.ts` - Centralized defaults
- `packages/drizzle-sync/src/pglite/config/index.ts` - Barrel exports

### Modify
None (new files only)

## Implementation Details

### Content of defaults.ts
```typescript
// config/defaults.ts

/**
 * Default values for NOT NULL columns that may be missing from sync payloads.
 * When the backend stores the original client payload in sync_operations,
 * fields with server-side defaults are not included.
 */
export const REQUIRED_COLUMN_DEFAULTS: Record<string, Record<string, unknown>> = {
  products: {
    base_price: "0",
    cost_price: "0",
  },
  product_variants: {
    price: "0",
    cost_price: "0",
    unit_quantity: "1",
  },
};

/**
 * Default conflict checking strategy
 */
export const DEFAULT_CONFLICT_STRATEGY = "pre-computed-set" as const;

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 100,
};

/**
 * Default batch processing config
 */
export const DEFAULT_BATCH_CONFIG = {
  checkConflicts: true,
  useTransaction: false,
};
```

## Verification Steps
```bash
# Build package
cd packages/drizzle-sync && bun run build

# Type check
cd packages/drizzle-sync && bun run typecheck
```

## Dependencies
- None (foundation task)

## Deliverables
1. `config/defaults.ts` with all constants
2. `config/index.ts` with exports
3. Constants ready for use by T-003 (Change Applier)

## Acceptance Criteria
- [ ] REQUIRED_COLUMN_DEFAULTS moved from change-applier.ts
- [ ] All related constants extracted
- [ ] Proper TypeScript types
- [ ] Can be imported from pglite/config

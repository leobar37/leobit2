# T-013: Relation Detection & Cascade Config (CRITICAL - Simplified)

## Objective

Detect parent-child relations from Drizzle schema and generate simple cascade sync configuration using **frontend-generated CUID2 IDs**.

## Problem Statement

Entities like `sales` have child `sale_items`. When syncing:
1. Parent (sale) created with CUID2 ID from frontend
2. Children (items) created with same ID reference
3. No ID mapping needed - CUID2 is the real ID
4. Order only matters for FK constraints (parent must exist)

## Solution Design (Simplified with CUID2)

### Key Insight

With **CUID2 frontend IDs**, there's no need for complex reference resolution:

```typescript
// ❌ BEFORE: Complex reference resolution
{ entity: "items", payload: { saleId: "@ref:sale_123" } }
// Required backend to resolve @ref: → real UUID

// ✅ AFTER: Simple direct reference
{ entity: "items", payload: { saleId: "cm9abc123xyz..." } }
// ID is real and consistent everywhere
```

### 1. Introspection Enhancement

Detect relations from Drizzle schema:

```typescript
// config/introspect-relations.ts
export function detectRelations(table: PgTable) {
  const columns = getTableColumns(table);
  
  return {
    // Foreign keys (this entity references others)
    foreignKeys: columns
      .filter(col => col.name.endsWith('_id') && !col.primary)
      .map(col => ({
        column: col.name,
        references: inferReferencedTable(col.name), // "sale_id" -> "sales"
        isRequired: col.notNull,
      })),
    
    // Children detected by FKs pointing to this table
    children: [] as string[],
  };
}

// Build relation graph for priority ordering
export function buildRelationGraph(
  entities: Record<string, EntityConfig>
) {
  const graph: Record<string, RelationNode> = {};
  
  // Detect FKs
  for (const [name, config] of Object.entries(entities)) {
    const relations = detectRelations(config.table);
    graph[name] = {
      parents: relations.foreignKeys.map(fk => fk.references),
      children: [],
      priority: 1,
    };
  }
  
  // Link children
  for (const [name, node] of Object.entries(graph)) {
    for (const parent of node.parents) {
      if (graph[parent]) {
        graph[parent].children.push(name);
      }
    }
  }
  
  // Calculate priorities (topological sort)
  // Parents processed before children for FK constraints
  const priorities = calculatePriorities(graph);
  for (const [name, priority] of Object.entries(priorities)) {
    graph[name].priority = priority;
  }
  
  return graph;
}
```

### 2. Config API Extension

```typescript
interface EntityConfig {
  table: PgTable;
  syncable: boolean;
  
  // Auto-detected from schema
  relations?: {
    children?: Array<{
      entity: string;
      foreignKey: string;
      cascade?: boolean;
    }>;
    parents?: Array<{
      entity: string;
      foreignKey: string;
    }>;
  };
  
  // Processing priority (calculated from graph)
  priority?: number;
}
```

### 3. Simple Hooks Generation (No @ref: Complexity)

```typescript
// generators/relation-hooks-generator.ts

export function generateHooksWithRelations(
  entityName: string,
  entityConfig: EntityConfig,
  relationGraph: RelationGraph
): string {
  const hasChildren = relationGraph[entityName]?.children.length > 0;
  
  return `
export function useCreate${pascalCase(entityName)}() {
  return useMutation({
    mutationFn: async (input: Create${pascalCase(entityName)}Input) => {
      ${hasChildren 
        ? generateWithChildrenCode(entityName, relationGraph) 
        : generateSimpleCode(entityName)}
    }
  });
}
`;
}

// Simple: just create with CUID2
function generateSimpleCode(entityName: string) {
  return `
  const id = createId(); // CUID2 from @paralleldrive/cuid2
  const response = await api.${entityName}.post({ ...input, id });
  return response.data;
  `;
}

// With children: batch with syncGroup, using REAL IDs
function generateWithChildrenCode(
  entityName: string, 
  graph: RelationGraph
) {
  const children = graph[entityName].children;
  
  return `
  // 1. Generate CUID2 for parent (this IS the real ID)
  const parentId = createId();
  
  // 2. Build parent operation
  const parentOp = {
    idempotencyKey: generateIdempotencyKey(),
    entityType: "${entityName}",
    operation: "create",
    entityId: parentId, // ← REAL CUID2 ID
    payload: { ...input, id: parentId },
    syncGroupId: generateSyncGroupId(),
    localTimestamp: new Date().toISOString(),
  };
  
  // 3. Build children with REAL parent ID reference
  const childOps = [
    ${children.map(child => `
    ...(input.${child}?.map((item) => ({
      idempotencyKey: generateIdempotencyKey(),
      entityType: "${child}",
      operation: "create",
      entityId: createId(), // Each child gets own CUID2
      payload: {
        ...item,
        ${getForeignKeyColumn(child)}: parentId, // ← Direct real ID, no @ref:
      },
      syncGroupId: parentOp.syncGroupId,
      localTimestamp: new Date().toISOString(),
    })) || [],
    `).join('')}
  ];
  
  // 4. Send atomic batch
  const result = await api.sync.batch.post({
    operations: [parentOp, ...childOps],
  });
  
  return { id: parentId, ...result };
  `;
}
```

### 4. Backend Simplification

With CUID2 frontend IDs, backend stays simple:

```typescript
// Backend handler - no ID mapping, no @ref: resolution
export class SaleSyncHandler extends BaseSyncHandler {
  async handleCreate(ctx, operation, tx) {
    // ID comes from client, use it directly
    const { id, total, customerId } = operation.payload;
    
    await this.saleRepo.create(ctx, {
      id,           // ← CUID2 from client, stored as-is
      total,
      customerId,
    }, tx);
  }
}

// Sale items handler - same simplicity
export class SaleItemSyncHandler extends BaseSyncHandler {
  async handleCreate(ctx, operation, tx) {
    const { id, saleId, productId, quantity } = operation.payload;
    
    // saleId is REAL CUID2 ID, FK constraint works normally
    await this.saleItemRepo.create(ctx, {
      id,
      saleId,       // ← REAL ID, no resolution needed
      productId,
      quantity,
    }, tx);
  }
}
```

### 5. Change Applier Simplification

```typescript
// generated/applier.ts

export const applierConfig = {
  validTables: new Set(["sales", "sale_items", ...]),
  
  tableColumns: {
    sales: new Set(["id", "business_id", "total", ...]),
    sale_items: new Set(["id", "sale_id", "product_id", ...]),
    // ...
  },
  
  // Simple priority for pull order (parents before children)
  applyOrder: [
    "customers",      // Priority 1
    "products",       // Priority 1
    "sales",          // Priority 1 (parents)
    "sale_items",     // Priority 2 (children with FK to sales)
    "purchases",      // Priority 1
    "purchase_items", // Priority 2
  ],
  
  // No complex cascade config needed - IDs are real
};
```

## Implementation Steps

1. **Relation Detection** (introspect.ts)
   - Analyze FK columns
   - Build simple priority graph
   - No ID resolution logic needed

2. **Config Extension** (types.ts)
   - Add relation fields
   - Auto-calculate priorities

3. **Hook Generation** 
   - Simple create with CUID2
   - Batch with children using REAL IDs
   - No @ref: resolution

4. **Backend Update**
   - Accept client-provided IDs
   - Remove defaultRandom() from schema
   - No mapping layer

## Acceptance Criteria

- [ ] Detects parent-child relations from Drizzle schema
- [ ] Calculates priorities (parents before children for FK constraints)
- [ ] Generates hooks using CUID2 IDs
- [ ] References use direct real IDs (no @ref: placeholders)
- [ ] Batch operations use syncGroup for atomicity
- [ ] Validates no circular dependencies
- [ ] URLs stable from creation (no redirects post-sync)

## Dependencies

- T-001: Define Config API (extend types)
- T-003: Introspection Module (add relation detection)
- **Backend change**: Accept CUID2 IDs (schema modification)

## Estimated Time

3 hours (simplified from 4h - no complex reference resolution)

## Notes

- **CRITICAL**: Backend must be updated to accept client IDs
- CUID2 provides 128-bit collision resistance (practically unique)
- No complex temp→real mapping needed
- URLs work offline and after sync without changes
- This is the key simplification that makes the library usable

---
*Updated for CUID2 frontend ID architecture*

# T-007: React Hooks Generator

## Objective

Generate React Query hooks for CRUD operations on entities using **CUID2 frontend-generated IDs**.

## Requirements

**From**: FR-007

## Implementation Details

### Files to Create

1. `packages/drizzle-sync/src/config/generators/hooks-generator.ts`
   - `generateHooks()` function
   - Simple CUID2 ID generation
   - Direct ID references (no @ref: complexity)

### Generator Design (Simplified with CUID2)

```typescript
// generators/hooks-generator.ts
import type { EntityConfig } from "../types";
import type { RelationGraph } from "../introspect-relations";

export interface HookOutput {
  listHook: string;
  singleHook: string;
  createHook: string;
  updateHook: string;
  deleteHook: string;
}

export function generateHooks(
  entityName: string,
  entityConfig: EntityConfig,
  relationGraph: RelationGraph,
  hasChildren: boolean
): HookOutput {
  return {
    listHook: generateListHook(entityName),
    singleHook: generateSingleHook(entityName),
    createHook: hasChildren 
      ? generateCreateWithChildren(entityName, relationGraph)
      : generateSimpleCreate(entityName),
    updateHook: generateUpdateHook(entityName),
    deleteHook: generateDeleteHook(entityName),
  };
}

// Simple entity create with CUID2
function generateSimpleCreate(entityName: string) {
  const pascalName = pascalCase(entityName);
  
  return `
export function useCreate${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: Create${pascalName}Input) => {
      // Generate CUID2 - this IS the real ID
      const id = createId();
      
      const response = await api.${entityName}.post({
        ...input,
        id, // ← Real CUID2 ID sent to backend
      });
      
      if (response.error) throw new Error(String(response.error.value));
      return ${entityName}Schema.parse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
    },
  });
}
`;
}

// Entity with children - batch with real IDs
function generateCreateWithChildren(
  entityName: string,
  relationGraph: RelationGraph
) {
  const pascalName = pascalCase(entityName);
  const children = relationGraph[entityName]?.children || [];
  
  return `
export function useCreate${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: Create${pascalName}Input) => {
      // 1. Generate CUID2 for parent (this IS the real ID)
      const parentId = createId();
      
      // 2. Build parent operation
      const parentOp = {
        idempotencyKey: generateIdempotencyKey(),
        entityType: "${entityName}",
        operation: "create" as const,
        entityId: parentId,
        payload: { ...input, id: parentId },
        syncGroupId: generateSyncGroupId(),
        localTimestamp: new Date().toISOString(),
      };
      
      // 3. Build children with REAL parent ID (no @ref:)
      ${children.map(child => `
      const ${child}Ops = (input.${child}?.map((item) => ({
        idempotencyKey: generateIdempotencyKey(),
        entityType: "${child}",
        operation: "create" as const,
        entityId: createId(),
        payload: {
          ...item,
          ${getForeignKey(child)}: parentId, // ← Direct real CUID2
        },
        syncGroupId: parentOp.syncGroupId,
        localTimestamp: new Date().toISOString(),
      })) || [];
      `).join('')}
      
      // 4. Send atomic batch
      const result = await api.sync.batch.post({
        operations: [parentOp, ${children.map(c => `...${c}Ops`).join(', ')}],
      });
      
      if (result.error) throw new Error(String(result.error.value));
      
      // Return parent with real ID (immediately usable in URL)
      return { id: parentId, ...result.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
      ${children.map(child => `
      queryClient.invalidateQueries({ queryKey: ["${child}"] });
      `).join('')}
    },
  });
}
`;
}

// Standard list hook
function generateListHook(entityName: string) {
  const pascalName = pascalCase(entityName);
  
  return `
export function use${pascalName}List() {
  return useQuery({
    queryKey: ["${entityName}"],
    queryFn: async () => {
      const { data, error } = await api.${entityName}.get();
      if (error) throw new Error(String(error.value));
      return ${entityName}Schema.array().parse(data);
    },
  });
}
`;
}

// Single item hook
function generateSingleHook(entityName: string) {
  const pascalName = pascalCase(entityName);
  
  return `
export function use${pascalName}(id: string) {
  return useQuery({
    queryKey: ["${entityName}", id],
    queryFn: async () => {
      const { data, error } = await api.${entityName}({ id }).get();
      if (error) throw new Error(String(error.value));
      return ${entityName}Schema.parse(data);
    },
    enabled: !!id,
  });
}
`;
}

// Update hook
function generateUpdateHook(entityName: string) {
  const pascalName = pascalCase(entityName);
  
  return `
export function useUpdate${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Update${pascalName}Input }) => {
      const response = await api.${entityName}({ id }).put(data);
      if (response.error) throw new Error(String(response.error.value));
      return ${entityName}Schema.parse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
      queryClient.invalidateQueries({ queryKey: ["${entityName}", variables.id] });
    },
  });
}
`;
}

// Delete hook
function generateDeleteHook(entityName: string) {
  const pascalName = pascalCase(entityName);
  
  return `
export function useDelete${pascalName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.${entityName}({ id }).delete();
      if (response.error) throw new Error(String(response.error.value));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entityName}"] });
    },
  });
}
`;
}

// Full file generation
export function generateHooksFile(
  hooks: Map<string, HookOutput>
): string {
  const imports = `
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { createId } from "@paralleldrive/cuid2";
import { 
  ${Array.from(hooks.keys()).map(e => `${e}Schema`).join(", ")}
} from "./schemas";
import type { 
  ${Array.from(hooks.keys()).map(pascalCase).join(", ")}
} from "./types";
import { generateSyncGroupId, generateIdempotencyKey } from "~/lib/sync/utils";
`;
  
  const content = Array.from(hooks.entries())
    .map(([name, hook]) => `
// ${pascalCase(name)} hooks
${hook.listHook}

${hook.singleHook}

${hook.createHook}

${hook.updateHook}

${hook.deleteHook}
    `).join("\n");
  
  return `// ⚠️ AUTO-GENERATED FILE - DO NOT EDIT
// Generated by drizzle-sync from backend schema
// Uses CUID2 for frontend ID generation

${imports}

${content}
`;
}
```

### Generated Output Example

```typescript
// packages/app/app/lib/db/generated/hooks.ts

// ⚠️ AUTO-GENERATED FILE - DO NOT EDIT
// Generated by drizzle-sync from backend schema
// Uses CUID2 for frontend ID generation

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { createId } from "@paralleldrive/cuid2";
import { 
  customerSchema, 
  saleSchema,
  saleItemSchema
} from "./schemas";
import type { Customer, Sale, SaleItem } from "./types";
import { generateSyncGroupId, generateIdempotencyKey } from "~/lib/sync/utils";

// Sale hooks with CUID2
export function useCreateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      // Generate CUID2 - this IS the real ID
      const parentId = createId();
      
      // Parent operation
      const parentOp = {
        idempotencyKey: generateIdempotencyKey(),
        entityType: "sales",
        operation: "create" as const,
        entityId: parentId,
        payload: { ...input, id: parentId },
        syncGroupId: generateSyncGroupId(),
        localTimestamp: new Date().toISOString(),
      };
      
      // Children with REAL parent ID
      const itemsOps = (input.items?.map((item) => ({
        idempotencyKey: generateIdempotencyKey(),
        entityType: "sale_items",
        operation: "create" as const,
        entityId: createId(),
        payload: {
          ...item,
          saleId: parentId, // ← Real CUID2, no @ref:
        },
        syncGroupId: parentOp.syncGroupId,
        localTimestamp: new Date().toISOString(),
      })) || [];
      
      // Atomic batch
      const result = await api.sync.batch.post({
        operations: [parentOp, ...itemsOps],
      });
      
      if (result.error) throw new Error(String(result.error.value));
      return { id: parentId, ...result.data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale_items"] });
    },
  });
}

// SaleItem hook - independent
export function useCreateSaleItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateSaleItemInput) => {
      const id = createId(); // CUID2
      const response = await api.saleItems.post({ ...input, id });
      if (response.error) throw new Error(String(response.error.value));
      return saleItemSchema.parse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale_items"] });
    },
  });
}
```

### Usage Example

```typescript
// Frontend component - clean and simple
function SaleForm() {
  const createSale = useCreateSale();
  const createItem = useCreateSaleItem();
  const navigate = useNavigate();
  
  const handleSubmit = async (data) => {
    // Option 1: Create with items (atomic)
    const sale = await createSale.mutateAsync({
      total: 100,
      customerId: "cm9cust456...",
      items: [
        { productId: "prod_1", quantity: 2, price: 50 },
        { productId: "prod_2", quantity: 1, price: 50 },
      ]
    });
    
    // URL is immediately valid with REAL ID
    navigate(`/sales/${sale.id}/items`); // ← No redirects needed
    
    // Option 2: Add more items later (independent)
    await createItem.mutateAsync({
      saleId: sale.id, // ← Direct real ID reference
      productId: "prod_3",
      quantity: 3,
    });
  };
}
```

## Key Differences from Complex Approach

| Aspect | Before (@ref:) | After (CUID2) |
|--------|---------------|---------------|
| ID Generation | Backend UUID | Frontend CUID2 |
| References | `@ref:sale_123` strings | Direct real IDs |
| ID Mapping | Required temp→real | Not needed |
| URL Stability | Redirects after sync | Stable from creation |
| Code Complexity | High (resolution layer) | Low (direct IDs) |

## Acceptance Criteria

- [ ] Generates hooks using CUID2 via `createId()`
- [ ] Creates use{Entity}List hook
- [ ] Creates use{Entity} hook for single item
- [ ] Creates useCreate{Entity} hook (with children support)
- [ ] Creates useUpdate{Entity} hook
- [ ] Creates useDelete{Entity} hook
- [ ] References use direct real IDs (no @ref:)
- [ ] Returns ID immediately usable in URLs
- [ ] Proper query invalidation
- [ ] TypeScript types for all hooks

## Dependencies

- T-004: Zod Schema Generator (needs schemas)
- T-013: Relation Detection (for children support)
- Backend: Must accept CUID2 IDs

## Estimated Time

3 hours (simplified from 4h)

## Notes

- **Requires backend change**: Accept client-provided CUID2 IDs
- CUID2 is 128-bit collision-resistant (1 in 2^128)
- URLs work offline and post-sync without changes
- No complex ID resolution layer needed
- SyncGroup only for batch atomicity, not ID mapping

---
*Updated for CUID2 frontend ID architecture*

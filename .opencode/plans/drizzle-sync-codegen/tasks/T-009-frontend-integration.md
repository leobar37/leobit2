# T-009: Frontend Integration

## Objective

Update frontend to use generated code from the library.

## Requirements

**From**: FR-009

## Implementation Details

### Files to Modify

1. `packages/app/.gitignore` (MODIFY)
   - Add `app/lib/db/generated/` to gitignore

2. `packages/app/app/lib/db/collections.ts` (MODIFY)
   - Import from generated schemas
   - Update functions to use generated types

3. `packages/app/app/lib/db/index.ts` (MODIFY)
   - Re-export from generated files

### Gitignore Update

```gitignore
# Generated sync files
app/lib/db/generated/
```

### Collections Update

```typescript
// app/lib/db/collections.ts

// Before: Manual schemas
// import { customerSchema } from "./schema";

// After: Generated schemas
import { customerSchema } from "./generated/schemas";
import type { Customer } from "./generated/types";

// Use generated hooks
import { useCustomerList, useCreateCustomer } from "./generated/hooks";

// Collection functions updated to use generated types
export async function createCustomer(data: CreateCustomerInput): Promise<Customer> {
  // Validation with generated schema
  const validated = customerSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(data);
  
  // Rest of function...
}
```

### Index Re-export

```typescript
// app/lib/db/index.ts

// Re-export generated code
export * from "./generated/schemas";
export * from "./generated/types";
export * from "./generated/hooks";

// Keep manual exports during transition
export * from "./schema"; // Legacy, remove after migration
```

### Migration Path

**Phase 1: Parallel Operation**
```typescript
// Keep both during transition
import { customerSchema as manualSchema } from "./schema";
import { customerSchema as generatedSchema } from "./generated/schemas";

// Use generated, fallback to manual
const schema = generatedSchema || manualSchema;
```

**Phase 2: Full Migration**
```typescript
// After verifying generated code works
import { customerSchema } from "./generated/schemas";
// Remove manual schema file
```

## Acceptance Criteria

- [ ] Add generated/ to .gitignore
- [ ] Update collections.ts to import from generated
- [ ] Create index.ts re-exporting generated code
- [ ] Ensure build works with generated files
- [ ] Provide clear error if generated files missing
- [ ] Document migration path in README

## Testing Strategy

1. Run sync:generate and verify files created
2. Build frontend and check for errors
3. Test runtime functionality
4. Verify types are correct

## Dependencies

- T-008: Backend Integration (needs generated files)

## Estimated Time

2 hours

## Notes

- Generated files should be gitignored (re-generated on build)
- Provide clear error message if files missing
- Keep backward compatibility during transition
- Document in README how to generate

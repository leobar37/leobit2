# T-011: CLI Validation Command

## Objective

Add `bun run sync:validate` command to validate config without generating.

## Requirements

**From**: FR-010

## Implementation Details

### CLI Command

```typescript
// Add to cli.ts

program
  .command("validate")
  .description("Validate sync config without generating")
  .option("-c, --config <path>", "Path to sync.config.ts", "./src/sync.config.ts")
  .option("--strict", "Strict mode (fail on warnings)")
  .action(async (options) => {
    try {
      console.log("🔍 Validating sync config...\n");
      
      // Load config
      const config = await loadConfig(options.config);
      
      // Run validation
      const result = validateConfig(config, { strict: options.strict });
      
      // Report results
      if (result.valid) {
        console.log("✅ Config is valid\n");
        
        // Summary
        console.log("Entities configured:");
        for (const [name, entity] of Object.entries(config.entities)) {
          const mode = entity.fields ? "explicit" : 
                       entity.autoFields ? "auto+exclude" : "auto";
          console.log(`  • ${name} (${mode}, priority: ${entity.priority || 'auto'})`);
        }
        
        console.log(`\nTotal: ${Object.keys(config.entities).length} entities`);
        process.exit(0);
      } else {
        console.error("❌ Config validation failed:\n");
        
        for (const error of result.errors) {
          console.error(`  ✗ ${error.path}: ${error.message}`);
          if (error.hint) {
            console.error(`    💡 ${error.hint}`);
          }
        }
        
        if (result.warnings.length > 0) {
          console.warn("\n⚠️  Warnings:");
          for (const warning of result.warnings) {
            console.warn(`  • ${warning.message}`);
          }
        }
        
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Validation failed:", error.message);
      process.exit(1);
    }
  });
```

### Validation Checks

```typescript
// config/validator.ts

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  hint?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
}

export function validateConfig(
  config: SyncConfig,
  options: { strict?: boolean } = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Check entities exist
  if (!config.entities || Object.keys(config.entities).length === 0) {
    errors.push({
      path: "entities",
      message: "No entities configured",
      hint: "Add at least one entity to sync.config.ts",
    });
  }
  
  // Validate each entity
  for (const [name, entity] of Object.entries(config.entities)) {
    const path = `entities.${name}`;
    
    // Check table reference
    if (!entity.table) {
      errors.push({
        path: `${path}.table`,
        message: "Missing table reference",
        hint: "Provide a Drizzle table: table: customers",
      });
    }
    
    // Check field definitions
    if (entity.fields && entity.excludeFields) {
      warnings.push({
        path: `${path}.fields`,
        message: "Both 'fields' and 'excludeFields' provided - 'fields' takes precedence",
      });
    }
    
    // Check for circular dependencies in relations
    if (entity.relations) {
      const cycle = detectCircularDependency(name, entity.relations, config);
      if (cycle) {
        errors.push({
          path: `${path}.relations`,
          message: `Circular dependency detected: ${cycle.join(" → ")}`,
          hint: "Remove the circular reference in entity relations",
        });
      }
    }
    
    // Validate conflict resolver
    const validResolvers = ["version-based", "last-write-wins", "merge"];
    if (entity.conflictResolver && !validResolvers.includes(entity.conflictResolver)) {
      errors.push({
        path: `${path}.conflictResolver`,
        message: `Invalid conflict resolver: ${entity.conflictResolver}`,
        hint: `Use one of: ${validResolvers.join(", ")}`,
      });
    }
  }
  
  // Check for duplicate priorities causing race conditions
  const priorityGroups = groupByPriority(config.entities);
  for (const [priority, entities] of Object.entries(priorityGroups)) {
    if (entities.length > 1 && hasDependencies(entities)) {
      warnings.push({
        path: "entities",
        message: `Multiple entities with priority ${priority} have dependencies`,
        hint: "Consider using different priorities to ensure correct order",
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: options.strict ? [...errors, ...warnings.map(w => ({ ...w, hint: undefined }))] : warnings,
  };
}
```

## Acceptance Criteria

- [ ] Add validate command to CLI
- [ ] Validate all entities have required fields
- [ ] Validate no circular dependencies
- [ ] Validate field names exist in table
- [ ] Validate conflict resolver values
- [ ] Show helpful error messages with hints
- [ ] Show summary on success
- [ ] Exit with proper status codes

## Testing Strategy

1. Test valid config passes
2. Test various error cases
3. Test warning display
4. Test strict mode

## Dependencies

- T-002: CLI Tool (needs command infrastructure)
- T-013: Relation Detection (needs circular dependency check)

## Estimated Time

2 hours

## Notes

- Validation is critical for developer experience
- Show helpful hints for common mistakes
- Fast feedback loop (validate before generate)

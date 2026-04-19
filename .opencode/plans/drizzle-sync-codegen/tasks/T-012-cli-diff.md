# T-012: CLI Diff Command

## Objective

Add `bun run sync:diff` command to show differences between current schema and generated code.

## Requirements

**From**: FR-011

## Implementation Details

### CLI Command

```typescript
// Add to cli.ts

program
  .command("diff")
  .description("Show diff between schema and generated code")
  .option("-c, --config <path>", "Path to sync.config.ts", "./src/sync.config.ts")
  .option("-o, --output <path>", "Output directory", "../app/app/lib/db/generated")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    try {
      console.log("🔍 Comparing schema with generated code...\n");
      
      // Load config
      const config = await loadConfig(options.config);
      
      // Load existing generated files
      const existing = await loadGeneratedFiles(options.output);
      
      // Generate new code (in memory)
      const generated = await generateAll(config, { dryRun: true });
      
      // Calculate diff
      const diff = calculateDiff(existing, generated);
      
      // Display results
      if (options.json) {
        console.log(JSON.stringify(diff, null, 2));
      } else {
        displayDiff(diff);
      }
      
      // Exit with status if changes found
      if (diff.hasChanges) {
        console.log("\n⚠️  Changes detected. Run 'sync:generate' to update.");
        process.exit(1);
      } else {
        console.log("\n✅ Generated code is up to date.");
        process.exit(0);
      }
    } catch (error) {
      console.error("❌ Diff failed:", error.message);
      process.exit(1);
    }
  });

function displayDiff(diff: DiffResult) {
  // Added entities
  if (diff.added.length > 0) {
    console.log(chalk.green("📦 New entities:"));
    for (const entity of diff.added) {
      console.log(`  + ${entity.name} (${entity.fields.length} fields)`);
    }
    console.log();
  }
  
  // Removed entities
  if (diff.removed.length > 0) {
    console.log(chalk.red("🗑️  Removed entities:"));
    for (const entity of diff.removed) {
      console.log(`  - ${entity.name}`);
    }
    console.log();
  }
  
  // Modified entities
  if (diff.modified.length > 0) {
    console.log(chalk.yellow("✏️  Modified entities:"));
    for (const mod of diff.modified) {
      console.log(`  • ${mod.name}:`);
      
      if (mod.fields.added.length > 0) {
        console.log(chalk.green(`    + Fields: ${mod.fields.added.join(", ")}`));
      }
      if (mod.fields.removed.length > 0) {
        console.log(chalk.red(`    - Fields: ${mod.fields.removed.join(", ")}`));
      }
      if (mod.fields.modified.length > 0) {
        console.log(chalk.yellow(`    ~ Types changed: ${mod.fields.modified.join(", ")}`));
      }
      
      if (mod.relations?.added) {
        console.log(chalk.green(`    + Relations added`));
      }
    }
    console.log();
  }
  
  // Summary
  console.log("Summary:");
  console.log(`  Added: ${diff.added.length} entities`);
  console.log(`  Removed: ${diff.removed.length} entities`);
  console.log(`  Modified: ${diff.modified.length} entities`);
}
```

### Diff Algorithm

```typescript
interface DiffResult {
  hasChanges: boolean;
  added: EntityDiff[];
  removed: EntityDiff[];
  modified: EntityModification[];
}

interface EntityModification {
  name: string;
  fields: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  relations?: {
    added: boolean;
    removed: boolean;
  };
}

function calculateDiff(
  existing: GeneratedFiles,
  generated: GeneratedOutput
): DiffResult {
  const existingEntities = parseExistingEntities(existing);
  const newEntities = parseNewEntities(generated);
  
  const added: EntityDiff[] = [];
  const removed: EntityDiff[] = [];
  const modified: EntityModification[] = [];
  
  // Find added entities
  for (const [name, entity] of Object.entries(newEntities)) {
    if (!existingEntities[name]) {
      added.push({ name, fields: Object.keys(entity.fields) });
    }
  }
  
  // Find removed entities
  for (const [name, entity] of Object.entries(existingEntities)) {
    if (!newEntities[name]) {
      removed.push({ name, fields: Object.keys(entity.fields) });
    }
  }
  
  // Find modified entities
  for (const [name, newEntity] of Object.entries(newEntities)) {
    const existingEntity = existingEntities[name];
    if (existingEntity) {
      const mod: EntityModification = {
        name,
        fields: { added: [], removed: [], modified: [] },
      };
      
      const newFields = Object.keys(newEntity.fields);
      const existingFields = Object.keys(existingEntity.fields);
      
      // Added fields
      for (const field of newFields) {
        if (!existingFields.includes(field)) {
          mod.fields.added.push(field);
        }
      }
      
      // Removed fields
      for (const field of existingFields) {
        if (!newFields.includes(field)) {
          mod.fields.removed.push(field);
        }
      }
      
      // Modified fields (type changes)
      for (const field of newFields) {
        if (existingFields.includes(field)) {
          const newType = newEntity.fields[field].type;
          const existingType = existingEntity.fields[field].type;
          if (newType !== existingType) {
            mod.fields.modified.push(`${field} (${existingType} → ${newType})`);
          }
        }
      }
      
      if (mod.fields.added.length > 0 || 
          mod.fields.removed.length > 0 || 
          mod.fields.modified.length > 0) {
        modified.push(mod);
      }
    }
  }
  
  return {
    hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0,
    added,
    removed,
    modified,
  };
}
```

## Acceptance Criteria

- [ ] Add diff command to CLI
- [ ] Compare existing vs generated code
- [ ] Show added entities (green)
- [ ] Show removed entities (red)
- [ ] Show modified entities (yellow)
- [ ] Show field-level changes
- [ ] JSON output option
- [ ] Exit with status 1 if changes detected
- [ ] Colored terminal output

## Testing Strategy

1. Test with no changes (clean state)
2. Test with new entity added
3. Test with entity removed
4. Test with field modifications
5. Test JSON output format

## Dependencies

- T-002: CLI Tool (needs command infrastructure)

## Estimated Time

2 hours

## Notes

- Useful for CI/CD pipelines
- Helpful for code reviews
- Can fail builds if schema drift detected
- Optional for MVP but nice to have

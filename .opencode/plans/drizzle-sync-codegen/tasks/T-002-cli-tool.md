# T-002: CLI Tool Infrastructure

## Objective

Create the CLI entry point and command structure for the sync code generation tool.

## Requirements

**From**: FR-002

## Implementation Details

### Files to Create/Modify

1. `packages/drizzle-sync/src/cli.ts` (NEW)
   - CLI entry point
   - Command registration
   - Argument parsing
   - Error handling

2. `packages/drizzle-sync/package.json` (MODIFY)
   - Add `bin` entry for CLI
   - Add CLI dependencies

3. `packages/drizzle-sync/src/config/loader.ts` (NEW)
   - Dynamic import of sync.config.ts
   - Path resolution
   - Error handling for missing config

### CLI Design

```bash
# Commands
$ bun run sync:generate          # Generate all frontend code
$ bun run sync:validate          # Validate config without generating
$ bun run sync:diff              # Show diff between schema and generated
$ bun run sync:clean             # Remove generated files

# Options
$ bun run sync:generate --config ./custom/sync.config.ts
$ bun run sync:generate --output ./custom/generated/
$ bun run sync:generate --dry-run   # Show what would be generated
```

### Implementation Structure

```typescript
// cli.ts
import { Command } from "commander";
import { loadConfig } from "./config/loader";
import { generateAll } from "./config/generator";
import { validateConfig } from "./config/validator";

const program = new Command();

program
  .name("drizzle-sync")
  .description("Generate frontend sync code from Drizzle schema")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate all frontend code")
  .option("-c, --config <path>", "Path to sync.config.ts", "./src/sync.config.ts")
  .option("-o, --output <path>", "Output directory", "../app/app/lib/db/generated")
  .option("--dry-run", "Show what would be generated without writing files")
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const output = await generateAll(config, options);
      console.log(`✅ Generated ${output.files.length} files`);
      
      if (output.changes.length > 0) {
        console.log("\nChanges detected:");
        output.changes.forEach(c => console.log(`  - ${c}`));
      }
    } catch (error) {
      console.error("❌ Generation failed:", error.message);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate sync config without generating")
  .option("-c, --config <path>", "Path to sync.config.ts")
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const result = validateConfig(config);
      if (result.valid) {
        console.log("✅ Config is valid");
      } else {
        console.error("❌ Config errors:");
        result.errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Validation failed:", error.message);
      process.exit(1);
    }
  });

export { program };
```

### Config Loader

```typescript
// config/loader.ts
export async function loadConfig(configPath: string) {
  // Resolve path relative to cwd
  const absolutePath = path.resolve(process.cwd(), configPath);
  
  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }
  
  // Dynamic import (ESM)
  const module = await import(absolutePath);
  
  // Handle both default and named exports
  const config = module.syncConfig || module.default;
  
  if (!config) {
    throw new Error(`Config must export 'syncConfig'`);
  }
  
  return config;
}
```

## Acceptance Criteria

- [ ] CLI can be invoked via `bun run sync:generate`
- [ ] CLI loads config from backend
- [ ] CLI has generate, validate, diff, clean commands
- [ ] CLI reports progress and errors clearly
- [ ] CLI exits with proper status codes
- [ ] CLI supports --config and --output options

## Testing Strategy

1. Test command parsing
2. Test config loading
3. Test error handling
4. Test exit codes

## Dependencies

- T-001: Define Config API (needs config types)

## Estimated Time

3 hours

## Notes

- Use `commander` for CLI framework (lightweight, popular)
- Consider `picocolors` for colored output
- Ensure paths work correctly in monorepo context
- Handle both CommonJS and ESM config files

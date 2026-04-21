# T-009: Refactor CLI to use schema.json

## Objective
Refactor the CLI commands to load sync.schema.json instead of importing and executing TypeScript config files.

## Requirements
- FR-005: CLI Reads Schema JSON

## Files to Modify
- `packages/drizzle-sync/src/cli.ts`

## Implementation Details

### Current CLI Flow

```
drizzle-sync generate
  → imports sync.config.ts (executes TS)
  → calls generateAll(config)
  → generators introspect Drizzle tables
```

### New CLI Flow

```
drizzle-sync generate --schema ./sync.schema.json
  → loads sync.schema.json (reads JSON)
  → calls generateAll(schema)
  → generators read from schema
```

### New CLI Implementation

```typescript
#!/usr/bin/env bun
import { Command } from "commander";
import { loadSchema, findSchema } from "./cli/schema-loader";
import { generateAll } from "./config/generator";
import { validateSchema } from "./cli/schema-loader";
import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const program = new Command();

program
  .name("drizzle-sync")
  .description("Generate frontend sync code from Drizzle schema")
  .version("0.2.0");

// Global option for schema path
program.option("-s, --schema <path>", "Path to sync.schema.json");

program
  .command("generate")
  .description("Generate all code from sync.schema.json")
  .option("-o, --output <path>", "Output directory", "./generated")
  .option("--target <frontend|backend>", "Generate for specific target")
  .option("--dry-run", "Show what would be generated without writing files")
  .action(async (options, command) => {
    try {
      const globalOpts = command.optsWithGlobals();
      
      // 1. Find or load schema
      let schemaPath = globalOpts.schema;
      
      if (!schemaPath) {
        console.log("🔍 Searching for sync.schema.json...");
        schemaPath = await findSchema();
        
        if (!schemaPath) {
          console.error("❌ sync.schema.json not found.");
          console.error("   Run 'drizzle-sync build-schema' first, or specify --schema");
          process.exit(1);
        }
        
        console.log(`   Found: ${schemaPath}`);
      }
      
      console.log("📖 Loading schema...");
      const schema = await loadSchema(schemaPath);
      console.log(`   Version: ${schema.version}`);
      console.log(`   Entities: ${Object.keys(schema.entities).length}`);
      console.log(`   Generated: ${schema.generatedAt}\n`);
      
      // 2. Validate and generate
      if (options.dryRun) {
        console.log("📋 DRY RUN - Would generate:");
        Object.entries(schema.entities).forEach(([name, entity]) => {
          console.log(`   - ${name} (${entity.columns.length} columns)`);
        });
        console.log("\n✨ Run without --dry-run to generate files\n");
        process.exit(0);
      }
      
      console.log("🚀 Generating code...\n");
      
      const output = await generateAll(schema, {
        outputDir: options.output,
        target: options.target, // "frontend" | "backend" | undefined (both)
      });
      
      console.log("✅ Generated files:\n");
      output.files.forEach((f) => console.log(`   ✓ ${f}`));
      
      if (output.changes.length > 0) {
        console.log("\n📊 Changes detected:");
        output.changes.forEach((c) => console.log(`   • ${c}`));
      }
      
      console.log("\n✨ Done!\n");
      process.exit(0);
    } catch (error) {
      console.error("\n❌ Generation failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate sync.schema.json")
  .action(async (options, command) => {
    try {
      const globalOpts = command.optsWithGlobals();
      const schemaPath = globalOpts.schema || await findSchema();
      
      if (!schemaPath) {
        console.error("❌ sync.schema.json not found");
        process.exit(1);
      }
      
      console.log("🔍 Loading schema...\n");
      const schema = await loadSchema(schemaPath);
      
      console.log("✅ Schema is valid\n");
      console.log(`Version: ${schema.version}`);
      console.log(`Generated: ${schema.generatedAt}`);
      console.log(`Entities:`);
      Object.entries(schema.entities).forEach(([name, entity]) => {
        console.log(`  • ${name} (${entity.columns.length} columns)`);
      });
      console.log(`\nTotal: ${Object.keys(schema.entities).length} entities\n`);
      
      process.exit(0);
    } catch (error) {
      console.error("❌ Validation failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("clean")
  .description("Remove all generated files")
  .option("-o, --output <path>", "Output directory", "./generated")
  .action(async (options) => {
    try {
      const outputDir = resolve(options.output);
      console.log(`🧹 Cleaning ${outputDir}...`);
      
      if (!existsSync(outputDir)) {
        console.log("Nothing to clean\n");
        process.exit(0);
      }
      
      await new Response(
        Bun.spawn(["rm", "-rf", outputDir]).stdout
      ).text();
      console.log("✅ Generated files removed\n");
      process.exit(0);
    } catch (error) {
      console.error("❌ Clean failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// NEW COMMAND: build-schema
program
  .command("build-schema")
  .description("Build sync.schema.json from sync.config.ts")
  .option("-c, --config <path>", "Path to sync.config.ts", "./src/sync.config.ts")
  .action(async (options) => {
    try {
      console.log("🔍 Loading sync config...\n");
      
      const configPath = resolve(options.config);
      if (!existsSync(configPath)) {
        console.error(`❌ Config file not found: ${configPath}`);
        process.exit(1);
      }
      
      // Import the config (this executes the TS file)
      const module = await import(configPath);
      const builder = module.syncConfig || module.default;
      
      if (!builder || typeof builder.buildSchema !== "function") {
        console.error("❌ Config must export a SyncConfigBuilder (use defineSyncConfig)");
        process.exit(1);
      }
      
      console.log("🔧 Building schema...\n");
      const schema = await builder.buildSchema();
      
      console.log("✅ Schema built successfully\n");
      console.log(`Output: ${builder.schemaManager?.getOutputPath()}`);
      console.log(`Entities: ${Object.keys(schema.entities).length}`);
      console.log(`Version: ${schema.version}\n`);
      
      process.exit(0);
    } catch (error) {
      console.error("❌ Build failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
```

## Changes Summary

1. **Remove** dependency on `loadConfig` (which imports TS)
2. **Add** `schema-loader.ts` for JSON loading
3. **Add** `--schema` global option
4. **Add** `build-schema` command (only command that executes TS)
5. **Modify** `generate` to accept `SyncSchema` instead of `SyncConfig`
6. **Add** `--target` option for selective generation

## Validation

- [ ] `generate` works with `--schema` flag
- [ ] `generate` auto-discovers schema.json
- [ ] `validate` checks schema format
- [ ] `build-schema` creates schema.json from config
- [ ] `clean` still works
- [ ] All error messages are helpful

## Notes

- Only `build-schema` command executes TypeScript
- All other commands are pure JSON operations
- This makes the CLI fast and safe

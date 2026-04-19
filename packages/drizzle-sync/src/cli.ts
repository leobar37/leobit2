#!/usr/bin/env bun
import { Command } from "commander";
import { loadConfig } from "./config/loader";
import { validateSyncConfig } from "./config/validator";
import { generateAll } from "./config/generator";
import { existsSync } from "fs";
import { resolve } from "path";

const program = new Command();

program
  .name("drizzle-sync")
  .description("Generate frontend sync code from Drizzle schema")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate all frontend code from sync.config.ts")
  .option("-c, --config <path>", "Path to sync.config.ts", "./src/sync.config.ts")
  .option("-o, --output <path>", "Output directory", "../app/app/lib/db/generated")
  .option("--dry-run", "Show what would be generated without writing files")
  .action(async (options) => {
    try {
      console.log("🔍 Loading sync config...\n");

      const configPath = resolve(options.config);
      if (!existsSync(configPath)) {
        console.error(`❌ Config file not found: ${configPath}`);
        process.exit(1);
      }

      const config = await loadConfig(configPath);

      console.log("✅ Config loaded");
      console.log(`   Found ${Object.keys(config.entities).length} entities\n`);

      console.log("🔧 Validating config...");
      const validation = validateSyncConfig(config);

      if (!validation.valid) {
        console.error("\n❌ Config validation failed:\n");
        validation.errors.forEach((e) => {
          console.error(`  ✗ ${e.path}: ${e.message}`);
          if (e.hint) console.error(`    💡 ${e.hint}`);
        });
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.warn("\n⚠️  Warnings:");
        validation.warnings.forEach((w) => console.warn(`  • ${w.message}`));
      }

      console.log("✅ Config valid\n");

      if (options.dryRun) {
        console.log("📋 DRY RUN - Would generate:");
        console.log(`   - schemas.ts (${Object.keys(config.entities).length} schemas)`);
        console.log(`   - init.sql (${Object.keys(config.entities).length} tables)`);
        console.log(`   - applier.ts (column mappings)`);
        console.log(`   - hooks.ts (${Object.keys(config.entities).length * 5} hooks)`);
        console.log(`   - types.ts (TypeScript types)\n`);
        console.log("✨ Run without --dry-run to generate files\n");
        process.exit(0);
      }

      console.log("🚀 Generating code...\n");

      const output = await generateAll(config, {
        outputDir: options.output,
      });

      console.log("✅ Generated files:\n");
      output.files.forEach((f) => console.log(`   ✓ ${f}`));

      if (output.changes.length > 0) {
        console.log("\n📊 Changes detected:");
        output.changes.forEach((c) => console.log(`   • ${c}`));
      }

      console.log("\n✨ Done! Import from ~/lib/db/generated/\n");
      process.exit(0);
    } catch (error) {
      console.error("\n❌ Generation failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate sync config without generating")
  .option("-c, --config <path>", "Path to sync.config.ts", "./src/sync.config.ts")
  .option("--strict", "Fail on warnings too")
  .action(async (options) => {
    try {
      console.log("🔍 Loading sync config...\n");

      const config = await loadConfig(options.config);
      console.log("✅ Config loaded\n");

      const result = validateSyncConfig(config);

      if (result.valid && result.warnings.length === 0) {
        console.log("✅ Config is valid\n");
        console.log("Entities:");
        Object.entries(config.entities).forEach(([name, entity]) => {
          const mode = entity.fields ? "explicit" : entity.autoFields ? "auto+exclude" : "auto";
          console.log(`  • ${name} (${mode})`);
        });
        console.log(`\nTotal: ${Object.keys(config.entities).length} entities\n`);
        process.exit(0);
      }

      if (result.valid && result.warnings.length > 0 && !options.strict) {
        console.log("✅ Config is valid (with warnings)\n");
        console.log("⚠️  Warnings:");
        result.warnings.forEach((w) => console.warn(`  • ${w.path}: ${w.message}`));
        console.log();
        process.exit(0);
      }

      if (!result.valid || (options.strict && result.warnings.length > 0)) {
        console.error("❌ Config validation failed:\n");
        result.errors.forEach((e) => {
          console.error(`  ✗ ${e.path}: ${e.message}`);
          if (e.hint) console.error(`    💡 ${e.hint}`);
        });
        if (options.strict) {
          result.warnings.forEach((w) => console.error(`  ⚠️  ${w.path}: ${w.message}`));
        }
        console.log();
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Validation failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("clean")
  .description("Remove all generated files")
  .option("-o, --output <path>", "Output directory", "../app/app/lib/db/generated")
  .action(async (options) => {
    try {
      const outputDir = resolve(options.output);
      console.log(`🧹 Cleaning ${outputDir}...`);

      if (!existsSync(outputDir)) {
        console.log("Nothing to clean\n");
        process.exit(0);
      }

      await Bun.spawn(["rm", "-rf", outputDir]);
      console.log("✅ Generated files removed\n");
      process.exit(0);
    } catch (error) {
      console.error("❌ Clean failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

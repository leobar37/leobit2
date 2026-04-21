#!/usr/bin/env bun
import { existsSync } from "fs";
import { resolve } from "path";
import { Command } from "commander";
import type { SyncConfigBuilder } from "./config/builder";
import { generateAll } from "./config/generator";
import { loadConfig } from "./config/loader";
import { validateSyncConfig } from "./config/validator";
import { findSchema, loadSchema } from "./cli/schema-loader";

const program = new Command();

program
  .name("drizzle-sync")
  .description("Generate frontend sync code from Drizzle schema")
  .version("0.2.0")
  .option("-s, --schema <path>", "Path to sync.schema.json");

program
  .command("generate")
  .description("Generate all frontend code from sync.schema.json")
  .option("-c, --config <path>", "Path to sync.config.ts", "./src/sync.config.ts")
  .option("-o, --output <path>", "Output directory", "../app/app/lib/db/generated")
  .option("--dry-run", "Show what would be generated without writing files")
  .action(async (options, command) => {
    try {
      const globalOptions = command.optsWithGlobals() as { schema?: string };
      const schemaPath = globalOptions.schema
        ? resolve(globalOptions.schema)
        : findSchema(process.cwd());

      if (!schemaPath) {
        console.error("No sync.schema.json found. Run `drizzle-sync build-schema` first or pass --schema.");
        process.exit(1);
      }

      console.log("Loading sync schema...\n");
      const schema = await loadSchema(schemaPath);

      console.log("Schema loaded");
      console.log(`Found ${Object.keys(schema.entities).length} entities\n`);

      if (options.dryRun) {
        console.log("DRY RUN - Would generate:");
        console.log(`- schemas.ts (${Object.keys(schema.entities).length} schemas)`);
        console.log(`- init.sql (${Object.keys(schema.entities).length} tables)`);
        console.log("- applier.ts (column mappings)");
        console.log(`- hooks.ts (${Object.keys(schema.entities).length * 5} hooks)`);
        console.log("- types.ts (TypeScript types)\n");
        process.exit(0);
      }

      console.log("Generating code...\n");

      const output = await generateAll(schema, {
        outputDir: options.output,
      });

      console.log("Generated files:\n");
      output.files.forEach((f) => console.log(`- ${f}`));

      if (output.changes.length > 0) {
        console.log("\nChanges detected:");
        output.changes.forEach((c) => console.log(`- ${c}`));
      }

      console.log("\nDone\n");
      process.exit(0);
    } catch (error) {
      console.error("\nGeneration failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate sync schema without generating")
  .action(async (_options, command) => {
    try {
      const globalOptions = command.optsWithGlobals() as { schema?: string };
      const schemaPath = globalOptions.schema
        ? resolve(globalOptions.schema)
        : findSchema(process.cwd());

      if (!schemaPath) {
        console.error("No sync.schema.json found. Run `drizzle-sync build-schema` first or pass --schema.");
        process.exit(1);
      }

      console.log("Loading sync schema...\n");
      const schema = await loadSchema(schemaPath);
      console.log("Schema is valid\n");
      console.log("Entities:");
      Object.keys(schema.entities).forEach((name) => {
        console.log(`- ${name}`);
      });
      console.log(`\nTotal: ${Object.keys(schema.entities).length} entities\n`);

      process.exit(0);
    } catch (error) {
      console.error("Validation failed:", error instanceof Error ? error.message : error);
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
      console.log(`Cleaning ${outputDir}...`);

      if (!existsSync(outputDir)) {
        console.log("Nothing to clean\n");
        process.exit(0);
      }

      await new Response(Bun.spawn(["rm", "-rf", outputDir]).stdout).text();
      console.log("Generated files removed\n");
      process.exit(0);
    } catch (error) {
      console.error("Clean failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("build-schema")
  .description("Build sync.schema.json from sync.config.ts")
  .option("-c, --config <path>", "Path to sync.config.ts", "./src/sync.config.ts")
  .action(async (options) => {
    try {
      const configPath = resolve(options.config);
      if (!existsSync(configPath)) {
        console.error(`Config file not found: ${configPath}`);
        process.exit(1);
      }

      const loaded = await loadConfig(configPath);
      const builder = loaded as SyncConfigBuilder;
      if (!builder || typeof builder.buildSchema !== "function") {
        console.error("Config must export defineSyncConfig(...) result.");
        process.exit(1);
      }

      const validation = validateSyncConfig(builder.getRuntimeConfig());
      if (!validation.valid) {
        console.error("\nConfig validation failed:\n");
        validation.errors.forEach((e) => {
          console.error(`- ${e.path}: ${e.message}`);
          if (e.hint) {
            console.error(`  Hint: ${e.hint}`);
          }
        });
        process.exit(1);
      }

      await builder.buildSchema();
      const outputPath = builder.schema?.getOutputPath();
      if (outputPath) {
        console.log(`Schema generated at ${outputPath}`);
      } else {
        console.log("Schema generated");
      }

      process.exit(0);
    } catch (error) {
      console.error("Build schema failed:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

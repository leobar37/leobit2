#!/usr/bin/env bun
import { existsSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { Command } from "commander";
import type { SyncConfigBuilder } from "./config/builder";
import { generateAll } from "./config/generator";
import { loadConfig, loadProjectConfig } from "./config/loader";
import { validateSyncConfig } from "./config/validator";
import { findSchema, loadSchema } from "./cli/schema-loader";
import type { DrizzleSyncProjectConfig } from "./config/types";

const DEFAULT_SYNC_CONFIG = "./src/sync.config.ts";
const DEFAULT_CLIENT_OUTPUT = "../app/app/lib/sync/generated";

interface ResolvedCliConfig {
  configPath: string;
  projectConfig?: DrizzleSyncProjectConfig;
  projectDir?: string;
}

function resolveProjectPath(config: ResolvedCliConfig, path: string): string {
  return resolve(config.projectDir ?? process.cwd(), path);
}

async function resolveCliConfig(configPathOption: string): Promise<ResolvedCliConfig> {
  const configPath = resolve(configPathOption);

  if (configPath.endsWith("drizzle-sync.config.ts") || configPath.endsWith("drizzle-sync.config.js")) {
    const projectConfig = await loadProjectConfig(configPath);
    return {
      configPath,
      projectConfig,
      projectDir: dirname(configPath),
    };
  }

  return { configPath };
}

async function loadSyncBuilder(config: ResolvedCliConfig): Promise<SyncConfigBuilder> {
  const syncConfigPath = config.projectConfig
    ? resolveProjectPath(config, config.projectConfig.schemaConfig)
    : config.configPath;

  const previousAutoBuild = process.env.DRIZZLE_SYNC_DISABLE_AUTO_BUILD;
  process.env.DRIZZLE_SYNC_DISABLE_AUTO_BUILD = "1";

  try {
    const loaded = await loadConfig(syncConfigPath);
    const builder = loaded as SyncConfigBuilder;
    if (!builder || typeof builder.buildSchema !== "function") {
      throw new Error("Config must export defineSyncConfig(...) result.");
    }

    return builder;
  } finally {
    if (previousAutoBuild === undefined) {
      delete process.env.DRIZZLE_SYNC_DISABLE_AUTO_BUILD;
    } else {
      process.env.DRIZZLE_SYNC_DISABLE_AUTO_BUILD = previousAutoBuild;
    }
  }
}

function getConfiguredSchemaPath(config: ResolvedCliConfig): string | undefined {
  return config.projectConfig?.schemaOutput
    ? resolveProjectPath(config, config.projectConfig.schemaOutput)
    : undefined;
}

const program = new Command();

program
  .name("drizzle-sync")
  .description("Generate sync code from Drizzle schema")
  .version("0.2.0")
  .option("-s, --schema <path>", "Path to sync.schema.json");

program
  .command("generate")
  .description("Generate frontend sync code from sync.schema.json")
  .option("-c, --config <path>", "Path to drizzle-sync.config.ts or sync.config.ts", DEFAULT_SYNC_CONFIG)
  .option("-o, --output <path>", "Frontend output directory")
  .option("--client-output <path>", "Frontend output directory (overrides --output)")
  .option("--server-output <path>", "Reserved for backend-only generated files")
  .option("--dry-run", "Show what would be generated without writing files")
  .action(async (options, command) => {
    try {
      const globalOptions = command.optsWithGlobals() as { schema?: string };
      const cliConfig = await resolveCliConfig(options.config);
      const schemaPath = globalOptions.schema
        ? resolve(globalOptions.schema)
        : getConfiguredSchemaPath(cliConfig) ?? findSchema(process.cwd());

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

      if (options.serverOutput) {
        console.warn(
          "Warning: this command generates frontend files only. --server-output is reserved and was not used."
        );
      }

      console.log("Generating code...\n");

      const outputDir = options.clientOutput
        ? resolve(options.clientOutput)
        : options.output
          ? resolve(options.output)
          : cliConfig.projectConfig
            ? resolveProjectPath(cliConfig, cliConfig.projectConfig.clientOutput)
            : resolve(DEFAULT_CLIENT_OUTPUT);
      const output = await generateAll(schema, {
        outputDir,
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
  .option("-c, --config <path>", "Path to drizzle-sync.config.ts or sync.config.ts", DEFAULT_SYNC_CONFIG)
  .action(async (options, command) => {
    try {
      const globalOptions = command.optsWithGlobals() as { schema?: string };
      const cliConfig = await resolveCliConfig(options.config);
      const schemaPath = globalOptions.schema
        ? resolve(globalOptions.schema)
        : getConfiguredSchemaPath(cliConfig) ?? findSchema(process.cwd());

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
  .description("Remove frontend generated files")
  .option("-c, --config <path>", "Path to drizzle-sync.config.ts or sync.config.ts", DEFAULT_SYNC_CONFIG)
  .option("-o, --output <path>", "Frontend output directory")
  .option("--client-output <path>", "Frontend output directory (overrides --output)")
  .option("--server-output <path>", "Reserved for backend-only generated files")
  .action(async (options) => {
    try {
      if (options.serverOutput) {
        console.warn(
          "Warning: this command cleans frontend files only. --server-output is reserved and was not used."
        );
      }

      const cliConfig = await resolveCliConfig(options.config);
      const outputDir = options.clientOutput
        ? resolve(options.clientOutput)
        : options.output
          ? resolve(options.output)
          : cliConfig.projectConfig
            ? resolveProjectPath(cliConfig, cliConfig.projectConfig.clientOutput)
            : resolve(DEFAULT_CLIENT_OUTPUT);
      console.log(`Cleaning ${outputDir}...`);

      if (!existsSync(outputDir)) {
        console.log("Nothing to clean\n");
        process.exit(0);
      }

      rmSync(outputDir, { recursive: true, force: true });
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
  .option("-c, --config <path>", "Path to drizzle-sync.config.ts or sync.config.ts", DEFAULT_SYNC_CONFIG)
  .action(async (options) => {
    try {
      const cliConfig = await resolveCliConfig(options.config);
      if (!existsSync(cliConfig.configPath)) {
        console.error(`Config file not found: ${cliConfig.configPath}`);
        process.exit(1);
      }

      const builder = await loadSyncBuilder(cliConfig);

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

      const configuredSchemaPath = getConfiguredSchemaPath(cliConfig);
      await builder.buildSchema(configuredSchemaPath ? { output: configuredSchemaPath } : undefined);
      const outputPath = configuredSchemaPath ?? builder.schema?.getOutputPath();
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

/**
 * Apply Missing Migrations Script
 * Aplica de manera inteligente las migraciones necesarias para sincronizar
 * la base de datos con el esquema Drizzle ORM.
 *
 * Usage:
 *   bun run scripts/apply-missing-migrations.ts [--dry-run] [--audit-file=path]
 *
 * Options:
 *   --dry-run         Muestra los cambios sin aplicarlos
 *   --audit-file      Usa un archivo de auditoría previo en lugar de ejecutar nuevo audit
 */

import postgres from "postgres";
import { config } from "dotenv";
import { existsSync } from "fs";

config();

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function c(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// Types matching schema-audit output
interface AuditReport {
  timestamp: string;
  databaseUrl: string;
  summary: {
    totalSchemaTables: number;
    totalDbTables: number;
    tablesWithIssues: number;
    totalMissingColumns: number;
  };
  tables: Array<{
    tableName: string;
    existsInDb: boolean;
    existsInSchema: boolean;
    missingInDb: Array<{
      name: string;
      type: string;
      isNullable: boolean;
      default: unknown;
      hasDefault: boolean;
    }>;
    missingInSchema: Array<{
      column_name: string;
      data_type: string;
    }>;
    typeMismatches: Array<{
      columnName: string;
      schemaType: string;
      dbType: string;
    }>;
  }>;
  sqlFixes: string[];
}

// Known migrations that need to be tracked in journal
const KNOWN_MIGRATIONS = [
  { tag: "0033_add_cost_price_snapshot", description: "Add cost_price_snapshot to sale_items" },
  { tag: "0034_add_sale_items_sync", description: "Add sync_status and sync_attempts to sale_items" },
  { tag: "0044_add_sync_group_id_to_items", description: "Add sync_group_id to sale_items and purchase_items" },
  { tag: "0042_create_sync_conflicts", description: "Create sync_conflicts table" },
  { tag: "0041_add_sync_group_ids", description: "Add sync_group_id to multiple tables" },
  { tag: "0040_add_purchase_sync_group_id", description: "Add sync_group_id to purchases" },
  { tag: "0039_add_purchase_draft", description: "Add draft status to purchases" },
  { tag: "0043_add_purchase_draft_enum", description: "Add draft to purchase_status enum" },
  { tag: "0045_visita_sale_set_null", description: "Change visita_id FK to SET NULL" },
  { tag: "0051_add_version_columns", description: "Add version, sync_status, sync_attempts to files and puntos_venta" },
  { tag: "0052_add_sync_device_tracking", description: "Add device tracking columns for sync" },
];

// Priority order for applying columns (dependencies first)
const COLUMN_PRIORITY: Record<string, number> = {
  // Sync columns first (foundational)
  sync_status: 1,
  sync_attempts: 1,
  version: 2,
  sync_group_id: 3,
  // Then other columns
  cost_price_snapshot: 4,
};

// Run the schema audit to get current state
async function runAudit(): Promise<AuditReport> {
  console.log(c("cyan", "🔍 Running schema audit...\n"));

  const proc = Bun.spawn({
    cmd: ["bun", "run", "scripts/schema-audit.ts", "--format=json"],
    cwd: "/Users/leobar37/code/avileo/packages/backend",
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  const errorOutput = await new Response(proc.stderr).text();

  const exitCode = await proc.exited;

  if (exitCode !== 0 && exitCode !== 1) {
    // Exit code 1 is expected when there are issues
    throw new Error(`Audit failed with exit code ${exitCode}: ${errorOutput}`);
  }

  return JSON.parse(output);
}

// Load audit from file
async function loadAuditFromFile(path: string): Promise<AuditReport> {
  if (!existsSync(path)) {
    throw new Error(`Audit file not found: ${path}`);
  }
  const content = await Bun.file(path).text();
  return JSON.parse(content);
}

// Sort SQL fixes by priority
function sortSqlFixes(sqlFixes: string[]): string[] {
  return sqlFixes.sort((a, b) => {
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);
    return priorityA - priorityB;
  });
}

function getPriority(sql: string): number {
  for (const [col, priority] of Object.entries(COLUMN_PRIORITY)) {
    if (sql.includes(`"${col}"`)) {
      return priority;
    }
  }
  return 100; // Default priority
}

// Execute SQL commands
async function executeSql(
  sql: postgres.Sql,
  commands: string[],
  dryRun: boolean
): Promise<{ success: string[]; failed: Array<{ sql: string; error: string }> }> {
  const success: string[] = [];
  const failed: Array<{ sql: string; error: string }> = [];

  for (const command of commands) {
    if (dryRun) {
      console.log(c("gray", `  [DRY-RUN] Would execute: ${command.substring(0, 80)}...`));
      success.push(command);
      continue;
    }

    try {
      await sql.unsafe(command);
      console.log(c("green", `  ✅ Applied: ${command.substring(0, 60)}...`));
      success.push(command);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(c("red", `  ❌ Failed: ${command.substring(0, 60)}...`));
      console.log(c("red", `     Error: ${errorMsg}`));
      failed.push({ sql: command, error: errorMsg });
    }
  }

  return { success, failed };
}

// Update journal with applied migrations
async function updateJournal(
  sql: postgres.Sql,
  migrations: typeof KNOWN_MIGRATIONS,
  dryRun: boolean
): Promise<void> {
  // Check if drizzle_journal table exists
  const tableExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'drizzle_journal'
    )
  `;

  if (!tableExists[0].exists) {
    console.log(c("yellow", "⚠️ drizzle_journal table not found, skipping journal update"));
    return;
  }

  console.log(c("cyan", "\n📝 Checking journal status..."));

  for (const migration of migrations) {
    const exists = await sql`
      SELECT EXISTS (
        SELECT FROM drizzle_journal
        WHERE tag = ${migration.tag}
      )
    `;

    if (!exists[0].exists) {
      if (dryRun) {
        console.log(c("gray", `  [DRY-RUN] Would add ${migration.tag} to journal`));
      } else {
        await sql`
          INSERT INTO drizzle_journal (tag, applied_at)
          VALUES (${migration.tag}, NOW())
          ON CONFLICT (tag) DO NOTHING
        `;
        console.log(c("green", `  ✅ Added ${migration.tag} to journal`));
      }
    }
  }
}

// Apply additional known migrations that are not just column additions
async function applyKnownMigrations(
  sql: postgres.Sql,
  dryRun: boolean
): Promise<{ success: string[]; failed: Array<{ sql: string; error: string }> }> {
  const success: string[] = [];
  const failed: Array<{ sql: string; error: string }> = [];

  console.log(c("cyan", "\n🔧 Applying known migrations..."));

  // Check if sync_conflicts table exists
  const syncConflictsExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'sync_conflicts'
    )
  `;

  if (!syncConflictsExists[0].exists) {
    const createSyncConflictsSql = `
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id UUID NOT NULL,
        server_version INTEGER NOT NULL,
        client_version INTEGER NOT NULL,
        server_data JSONB NOT NULL,
        client_data JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        resolution_strategy VARCHAR(50),
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by UUID,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    try {
      if (dryRun) {
        console.log(c("gray", "  [DRY-RUN] Would create sync_conflicts table"));
      } else {
        await sql.unsafe(createSyncConflictsSql);
        console.log(c("green", "  ✅ Created sync_conflicts table"));
      }
      success.push("0042_create_sync_conflicts");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(c("red", "  ❌ Failed to create sync_conflicts table"));
      failed.push({ sql: "0042_create_sync_conflicts", error: errorMsg });
    }
  }

  return { success, failed };
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const auditFileArg = args.find((a) => a.startsWith("--audit-file="));
  const auditFile = auditFileArg?.split("=")[1];

  console.log(c("cyan", "=".repeat(80)));
  console.log(c("cyan", "  APPLY MISSING MIGRATIONS"));
  console.log(c("cyan", "=".repeat(80)));
  console.log();

  if (dryRun) {
    console.log(c("yellow", "⚠️  DRY-RUN MODE: No changes will be applied\n"));
  }

  // Get audit report
  let audit: AuditReport;
  try {
    audit = auditFile ? await loadAuditFromFile(auditFile) : await runAudit();
  } catch (error) {
    console.error(c("red", "❌ Failed to run audit:"), error);
    process.exit(1);
  }

  // Check if there are issues to fix
  if (audit.summary.totalMissingColumns === 0) {
    console.log(c("green", "✅ No missing columns found! Database is in sync with schema."));
    process.exit(0);
  }

  console.log(c("yellow", `📊 Found ${audit.summary.totalMissingColumns} missing columns\n`));

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = postgres(databaseUrl, {
    ssl: true,
    prepare: false,
  });

  try {
    // Sort SQL fixes by priority
    const sortedFixes = sortSqlFixes(audit.sqlFixes);

    console.log(c("cyan", "🚀 Applying column migrations..."));
    console.log(c("gray", `   ${sortedFixes.length} SQL commands to execute\n`));

    // Execute SQL fixes
    const result = await executeSql(sql, sortedFixes, dryRun);

    // Apply known migrations (tables, indexes, etc.)
    const knownResult = await applyKnownMigrations(sql, dryRun);

    // Combine results
    const totalSuccess = [...result.success, ...knownResult.success];
    const totalFailed = [...result.failed, ...knownResult.failed];

    // Update journal
    if (!dryRun && totalSuccess.length > 0) {
      await updateJournal(sql, KNOWN_MIGRATIONS, dryRun);
    }

    // Print summary
    console.log(c("cyan", "\n" + "=".repeat(80)));
    console.log(c("cyan", "  SUMMARY"));
    console.log(c("cyan", "=".repeat(80)));
    console.log();
    console.log(c("green", `  ✅ Successful: ${totalSuccess.length}`));
    console.log(c("red", `  ❌ Failed: ${totalFailed.length}`));
    console.log();

    if (totalFailed.length > 0) {
      console.log(c("red", "  Failed migrations:"));
      for (const fail of totalFailed) {
        console.log(c("red", `    • ${fail.sql.substring(0, 60)}...`));
        console.log(c("gray", `      ${fail.error}`));
      }
      console.log();
    }

    // Recommendations
    if (totalSuccess.length > 0 && !dryRun) {
      console.log(c("green", "✅ Database schema updated successfully!"));
      console.log(c("cyan", "\nNext steps:"));
      console.log("  1. Run the application and test sync functionality");
      console.log("  2. Verify the specific error (sync_group_id) is resolved");
      console.log("  3. Consider running: bun run db:generate to update migrations");
    } else if (dryRun) {
      console.log(c("yellow", "⚠️  This was a dry run. To apply changes, run without --dry-run flag"));
    }

    console.log();

    // Exit with error code if there were failures
    if (totalFailed.length > 0) {
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(c("red", "\n❌ Fatal error:"), error);
  process.exit(1);
});

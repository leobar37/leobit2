import { sql } from "drizzle-orm";
import { db } from "../../lib/db";

type TableConfig = {
  name: "customers" | "suppliers" | "tags";
  label: string;
};

type SummaryRow = {
  pending: number | string | null;
  synced: number | string | null;
  error: number | string | null;
  total: number | string | null;
};

type BusinessRow = {
  business_id: string;
  business_name: string | null;
  pending: number | string | null;
  synced: number | string | null;
  error: number | string | null;
  total: number | string | null;
};

type BusinessCatalogRow = {
  id: string;
  name: string;
};

type RecentRow = {
  id: string;
  name: string;
  sync_status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

const TABLES: TableConfig[] = [
  { name: "customers", label: "Customers" },
  { name: "suppliers", label: "Suppliers" },
  { name: "tags", label: "Tags" },
];

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function formatDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

async function printBusinessCatalog(): Promise<void> {
  const rows = await db.execute(sql`
    SELECT id, name
    FROM businesses
    ORDER BY created_at DESC
  `);

  const businesses = rows as BusinessCatalogRow[];

  if (businesses.length === 0) {
    console.log("No businesses found.\n");
    return;
  }

  console.log("Businesses:");
  businesses.forEach((business) => {
    console.log(`- ${business.id} | ${business.name}`);
  });
  console.log();
}

async function printTableSummary(table: TableConfig, businessId?: string): Promise<void> {
  const tableName = sql.raw(table.name);
  const filter = businessId
    ? sql`WHERE business_id = ${businessId}`
    : sql``;

  const summaryRows = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE sync_status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE sync_status = 'synced')::int AS synced,
      COUNT(*) FILTER (WHERE sync_status = 'error')::int AS error,
      COUNT(*)::int AS total
    FROM ${tableName}
    ${filter}
  `);

  const [summary] = summaryRows as SummaryRow[];

  console.log(`=== ${table.label} ===`);
  console.log(
    `total=${toNumber(summary?.total)} pending=${toNumber(summary?.pending)} synced=${toNumber(summary?.synced)} error=${toNumber(summary?.error)}`
  );

  if (!businessId) {
    const byBusinessRows = await db.execute(sql`
      SELECT
        table_rows.business_id,
        businesses.name AS business_name,
        COUNT(*) FILTER (WHERE table_rows.sync_status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE table_rows.sync_status = 'synced')::int AS synced,
        COUNT(*) FILTER (WHERE table_rows.sync_status = 'error')::int AS error,
        COUNT(*)::int AS total
      FROM ${tableName} AS table_rows
      LEFT JOIN businesses ON businesses.id = table_rows.business_id
      GROUP BY table_rows.business_id, businesses.name
      ORDER BY businesses.name ASC NULLS LAST, table_rows.business_id ASC
    `);

    const byBusiness = byBusinessRows as BusinessRow[];

    if (byBusiness.length > 0) {
      console.log("By business:");
      byBusiness.forEach((row) => {
        console.log(
          `- ${row.business_name ?? "Unknown"} (${row.business_id}): total=${toNumber(row.total)} pending=${toNumber(row.pending)} synced=${toNumber(row.synced)} error=${toNumber(row.error)}`
        );
      });
    }
  }

  const recentRows = await db.execute(sql`
    SELECT
      id,
      name,
      sync_status,
      created_at,
      updated_at
    FROM ${tableName}
    ${filter}
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 5
  `);

  const recent = recentRows as RecentRow[];

  if (recent.length === 0) {
    console.log("Recent rows: none\n");
    return;
  }

  console.log("Recent rows:");
  recent.forEach((row) => {
    console.log(
      `- ${row.id} | ${row.name} | ${row.sync_status} | created=${formatDate(row.created_at)} | updated=${formatDate(row.updated_at)}`
    );
  });
  console.log();
}

async function main() {
  const businessId = process.argv[2] ?? process.env.BUSINESS_ID;

  console.log("=== Sync Status Diagnostic ===\n");

  if (businessId) {
    console.log(`Business filter: ${businessId}\n`);
  } else {
    console.log("Business filter: all businesses\n");
    await printBusinessCatalog();
  }

  for (const table of TABLES) {
    await printTableSummary(table, businessId);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error("Sync status diagnostic failed:", error);
  process.exit(1);
});

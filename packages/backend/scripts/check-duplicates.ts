/**
 * Script: check-duplicates.ts
 * Verifica duplicados en la base de datos PostgreSQL
 * 
 * Uso: bun run scripts/check-duplicates.ts [--business-id=xxx]
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: true,
  prepare: false,
});

const db = drizzle(client, { schema });

interface DuplicateResult {
  table_name: string;
  column_name: string;
  value: string;
  count: number;
  business_id: string | null;
}

interface TableStats {
  table_name: string;
  total: number;
  unique_by_id: number;
  duplicates: number;
}

async function checkDuplicates() {
  console.log("\n=== VERIFICACIÓN DE DUPLICADOS EN POSTGRESQL ===\n");

  try {
    const businessIdArg = process.argv.find(arg => arg.startsWith("--business-id="));
    const targetBusinessId = businessIdArg?.split("=")[1];

    if (targetBusinessId) {
      console.log(`🔍 Filtrando por business_id: ${targetBusinessId}\n`);
    }

    const tablesToCheck = [
      { name: "products", schema: schema.products },
      { name: "customers", schema: schema.customers },
      { name: "sales", schema: schema.sales },
      { name: "product_variants", schema: schema.productVariants },
      { name: "tags", schema: schema.tags },
    ];

    const stats: TableStats[] = [];

    for (const table of tablesToCheck) {
      console.log(`\n📊 Tabla: ${table.name}`);
      console.log("-".repeat(50));

      const whereClause = targetBusinessId 
        ? sql`WHERE business_id = ${targetBusinessId}`
        : sql``;

      const countQuery = targetBusinessId
        ? sql`SELECT COUNT(*) as total FROM ${table.schema} WHERE business_id = ${targetBusinessId}`
        : sql`SELECT COUNT(*) as total FROM ${table.schema}`;

      const totalCount = await db.execute(countQuery);
      const total = Number(totalCount[0]?.total ?? 0);

      const distinctIdQuery = targetBusinessId
        ? sql`SELECT COUNT(DISTINCT id) as unique_count FROM ${table.schema} WHERE business_id = ${targetBusinessId}`
        : sql`SELECT COUNT(DISTINCT id) as unique_count FROM ${table.schema}`;

      const distinctIdResult = await db.execute(distinctIdQuery);
      const uniqueById = Number(distinctIdResult[0]?.unique_count ?? 0);

      const duplicates = total - uniqueById;

      console.log(`   Total registros: ${total}`);
      console.log(`   IDs únicos: ${uniqueById}`);
      
      if (duplicates > 0) {
        console.log(`   ⚠️  DUPLICADOS POR ID: ${duplicates}`);
      } else {
        console.log(`   ✅ Sin duplicados por ID`);
      }

      stats.push({
        table_name: table.name,
        total,
        unique_by_id: uniqueById,
        duplicates,
      });

      if (duplicates > 0) {
        const duplicateIdsQuery = targetBusinessId
          ? sql`
              SELECT id, COUNT(*) as count, business_id
              FROM ${table.schema}
              WHERE business_id = ${targetBusinessId}
              GROUP BY id, business_id
              HAVING COUNT(*) > 1
              ORDER BY count DESC
              LIMIT 10
            `
          : sql`
              SELECT id, COUNT(*) as count, business_id
              FROM ${table.schema}
              GROUP BY id, business_id
              HAVING COUNT(*) > 1
              ORDER BY count DESC
              LIMIT 10
            `;

        const duplicateIds = await db.execute(duplicateIdsQuery);

        console.log(`\n   🔍 IDs duplicados (top 10):`);
        for (const row of duplicateIds) {
          console.log(`      - ID: ${row.id}, Aparece: ${row.count} veces, Business: ${row.business_id}`);
        }
      }

      const nameColumn = table.name === "product_variants" ? "name" : "name";
      const tableName = table.name === "product_variants" ? "product_variants" : table.name;
      
      if (tableName !== "sales") {
        const duplicateNamesQuery = targetBusinessId
          ? sql`
              SELECT ${sql.identifier(nameColumn)} as name, COUNT(*) as count, business_id
              FROM ${table.schema}
              WHERE business_id = ${targetBusinessId}
              GROUP BY ${sql.identifier(nameColumn)}, business_id
              HAVING COUNT(*) > 1
              ORDER BY count DESC
              LIMIT 10
            `
          : sql`
              SELECT ${sql.identifier(nameColumn)} as name, COUNT(*) as count, business_id
              FROM ${table.schema}
              GROUP BY ${sql.identifier(nameColumn)}, business_id
              HAVING COUNT(*) > 1
              ORDER BY count DESC
              LIMIT 10
            `;

        try {
          const duplicateNames = await db.execute(duplicateNamesQuery);

          if (duplicateNames.length > 0) {
            console.log(`\n   🔍 Nombres duplicados (top 10):`);
            for (const row of duplicateNames) {
              console.log(`      - "${row.name}": ${row.count} veces, Business: ${row.business_id}`);
            }
          }
        } catch (error) {
          console.log(`   ℹ️  No se pudo verificar nombres duplicados`);
        }
      }
    }

    console.log("\n\n=== RESUMEN ===\n");
    console.log("Tabla".padEnd(20) + "Total".padEnd(10) + "Únicos".padEnd(10) + "Duplicados");
    console.log("-".repeat(50));
    
    let hasDuplicates = false;
    for (const stat of stats) {
      const status = stat.duplicates > 0 ? "⚠️ " : "✅ ";
      console.log(
        status +
        stat.table_name.padEnd(18) +
        String(stat.total).padEnd(10) +
        String(stat.unique_by_id).padEnd(10) +
        String(stat.duplicates)
      );
      if (stat.duplicates > 0) hasDuplicates = true;
    }

    if (hasDuplicates) {
      console.log("\n❌ Se encontraron duplicados. Ejecutar script de limpieza.");
    } else {
      console.log("\n✅ No se encontraron duplicados en la base de datos.");
    }

    const businessesQuery = sql`
      SELECT 
        b.id,
        b.name,
        COUNT(DISTINCT p.id) as products_count,
        COUNT(DISTINCT c.id) as customers_count,
        COUNT(DISTINCT s.id) as sales_count
      FROM businesses b
      LEFT JOIN products p ON p.business_id = b.id
      LEFT JOIN customers c ON c.business_id = b.id
      LEFT JOIN sales s ON s.business_id = b.id
      GROUP BY b.id, b.name
      ORDER BY b.name
    `;

    const businesses = await db.execute(businessesQuery);

    console.log("\n\n=== NEGOCIOS EN LA BASE DE DATOS ===\n");
    console.log("ID".padEnd(30) + "Nombre".padEnd(30) + "Productos".padEnd(12) + "Clientes".padEnd(12) + "Ventas");
    console.log("-".repeat(100));
    
    for (const biz of businesses) {
      console.log(
        String(biz.id).padEnd(30) +
        String(biz.name).padEnd(30) +
        String(biz.products_count ?? 0).padEnd(12) +
        String(biz.customers_count ?? 0).padEnd(12) +
        String(biz.sales_count ?? 0)
      );
    }

    console.log("\n");

  } catch (error) {
    console.error("\n❌ Error al verificar duplicados:", error);
    throw error;
  } finally {
    await client.end();
  }
}

checkDuplicates().catch(console.error);
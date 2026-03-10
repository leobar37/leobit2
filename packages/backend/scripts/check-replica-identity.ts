#!/usr/bin/env bun
/**
 * Script para verificar el estado de REPLICA IDENTITY en PostgreSQL
 * para ElectricSQL sync
 */

import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

const TABLES_TO_CHECK = [
  "sales",
  "sale_items",
  "customers",
  "products",
  "product_variants",
  "orders",
  "order_items",
  "abonos",
];

interface ReplicaIdentityResult {
  table_name: string;
  replica_identity: string;
}

async function checkReplicaIdentity() {
  console.log("🔍 Verificando REPLICA IDENTITY en PostgreSQL...\n");

  try {
    // Consulta para verificar REPLICA IDENTITY
    const results = await db.execute(sql`
      SELECT 
        relname AS table_name,
        CASE relreplident
          WHEN 'd' THEN 'default'
          WHEN 'n' THEN 'nothing'
          WHEN 'f' THEN 'full'
          WHEN 'i' THEN 'index'
        END AS replica_identity
      FROM pg_class
      WHERE relname IN (
        ${sql.join(
          TABLES_TO_CHECK.map((t) => sql.raw(`'${t}'`)),
          sql`, `
        )}
      )
      AND relkind = 'r'
      ORDER BY relname;
    `);

    console.log("📊 Estado de REPLICA IDENTITY por tabla:\n");
    console.log("┌──────────────────────┬───────────────────┐");
    console.log("│ Tabla                │ Replica Identity  │");
    console.log("├──────────────────────┼───────────────────┤");

    let allConfigured = true;
    const rows = results as ReplicaIdentityResult[];

    for (const table of TABLES_TO_CHECK) {
      const row = rows.find((r) => r.table_name === table);
      const status = row?.replica_identity || "NOT FOUND";
      const isOk = status === "full";
      const icon = isOk ? "✅" : "❌";

      if (!isOk) allConfigured = false;

      console.log(
        `│ ${table.padEnd(20)} │ ${status.padEnd(17)} ${icon} │`
      );
    }

    console.log("└──────────────────────┴───────────────────┘\n");

    if (allConfigured) {
      console.log(
        "✅ ¡Todas las tablas tienen REPLICA IDENTITY FULL configurado!\n"
      );
      console.log("ElectricSQL puede sincronizar correctamente.\n");
    } else {
      console.log(
        "⚠️  ALGUNAS TABLAS NO TIENEN REPLICA IDENTITY FULL configurado.\n"
      );
      console.log("Para aplicar la migración pendiente, ejecuta:\n");
      console.log("  cd packages/backend");
      console.log("  bun run db:migrate\n");
      console.log("O manualmente en PostgreSQL:\n");
      console.log("  ALTER TABLE <tabla> REPLICA IDENTITY FULL;\n");
    }

    // Verificar migración en drizzle
    console.log("📁 Verificando archivos de migración...\n");

    const fs = await import("fs");
    const path = await import("path");

    const migrationFile = path.join(
      process.cwd(),
      "drizzle",
      "0020_add_replica_identity.sql"
    );

    if (fs.existsSync(migrationFile)) {
      console.log("✅ Archivo de migración encontrado:");
      console.log(`   ${migrationFile}\n`);

      const content = fs.readFileSync(migrationFile, "utf-8");
      const lines = content.split("\n").filter((line) => line.includes("ALTER"));

      console.log("📋 Contenido de la migración:");
      lines.forEach((line) => {
        const table = line.match(/ALTER TABLE (\w+)/)?.[1];
        console.log(`   - ${table || line}`);
      });
    } else {
      console.log("❌ Archivo de migración NO encontrado\n");
    }

    // Verificar journal
    const journalFile = path.join(
      process.cwd(),
      "drizzle",
      "meta",
      "_journal.json"
    );

    if (fs.existsSync(journalFile)) {
      const journal = JSON.parse(fs.readFileSync(journalFile, "utf-8"));
      const replicaMigration = journal.entries?.find(
        (e: { tag: string }) => e.tag === "0020_add_replica_identity"
      );

      if (replicaMigration) {
        console.log(
          "\n✅ Migración registrada en journal: 0020_add_replica_identity"
        );
      } else {
        console.log(
          "\n❌ Migración NO registrada en journal (ejecuta 'bun run db:generate')"
        );
      }
    }

    process.exit(allConfigured ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Error al verificar REPLICA IDENTITY:\n");
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
console.log("═══════════════════════════════════════════════════");
console.log("  Verificación de REPLICA IDENTITY para ElectricSQL");
console.log("═══════════════════════════════════════════════════\n");

checkReplicaIdentity();

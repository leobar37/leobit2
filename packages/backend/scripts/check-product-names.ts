/**
 * Script: check-product-names.ts
 * Verifica productos con el mismo nombre (diferentes IDs)
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: true,
  prepare: false,
});

const db = drizzle(client);

async function checkProductNames() {
  console.log("\n=== VERIFICACIÓN DE PRODUCTOS CON EL MISMO NOMBRE ===\n");

  try {
    const duplicates = await db.execute(sql`
      SELECT 
        name,
        COUNT(*) as count,
        array_agg(id ORDER BY id) as product_ids,
        array_agg(business_id ORDER BY id) as business_ids,
        array_agg(base_price ORDER BY id) as prices,
        array_agg(created_at ORDER BY id) as created_dates
      FROM products
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY count DESC, name
    `);

    if (duplicates.length === 0) {
      console.log("✅ No hay productos con el mismo nombre\n");
    } else {
      console.log(`⚠️  Se encontraron ${duplicates.length} nombres de productos duplicados:\n`);
      
      for (const row of duplicates) {
        console.log(`\n📦 Producto: "${row.name}"`);
        console.log(`   Aparece ${row.count} veces:`);
        
        const ids = row.product_ids as string[];
        const businessIds = row.business_ids as string[];
        const prices = row.prices as string[];
        const dates = row.created_dates as Date[];
        
        for (let i = 0; i < ids.length; i++) {
          console.log(`   ${i + 1}. ID: ${ids[i]}`);
          console.log(`      Business: ${businessIds[i]}`);
          console.log(`      Precio: S/ ${prices[i]}`);
          console.log(`      Creado: ${dates[i]}`);
        }
      }
    }

    const allProducts = await db.execute(sql`
      SELECT 
        p.id,
        p.name,
        p.base_price,
        p.type,
        p.unit,
        p.created_at,
        b.name as business_name,
        b.id as business_id
      FROM products p
      JOIN businesses b ON b.id = p.business_id
      ORDER BY p.name, p.created_at
    `);

    console.log("\n\n=== TODOS LOS PRODUCTOS ===\n");
    console.log("ID".padEnd(30) + "Nombre".padEnd(20) + "Tipo".padEnd(10) + "Precio".padEnd(10) + "Unidad".padEnd(10) + "Negocio");
    console.log("-".repeat(110));
    
    for (const p of allProducts) {
      const bizShort = (p.business_name as string).substring(0, 15);
      console.log(
        (p.id as string).padEnd(30) +
        (p.name as string).padEnd(20) +
        (p.type as string).padEnd(10) +
        (`S/ ${p.base_price}`).padEnd(10) +
        (p.unit as string).padEnd(10) +
        bizShort
      );
    }

    console.log(`\n\nTotal productos: ${allProducts.length}`);

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await client.end();
  }
}

checkProductNames().catch(console.error);
/**
 * Script para agregar la columna version a puntos_venta
 * Ejecutar: bun run fix-puntos-venta-version
 */
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  ssl: true,
  prepare: false,
});

async function fixPuntosVenta() {
  try {
    console.log('🔧 Verificando columna version en puntos_venta...');
    
    // Verificar si la columna existe
    const result = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'puntos_venta' 
      AND column_name = 'version'
    `;
    
    if (result.length === 0) {
      console.log('⚠️  Columna version no existe. Agregando...');
      
      await client`
        ALTER TABLE puntos_venta 
        ADD COLUMN version INTEGER NOT NULL DEFAULT 1
      `;
      
      await client`
        CREATE INDEX IF NOT EXISTS idx_puntos_venta_version ON puntos_venta(version)
      `;
      
      console.log('✅ Columna version agregada exitosamente');
    } else {
      console.log('✅ Columna version ya existe');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixPuntosVenta();

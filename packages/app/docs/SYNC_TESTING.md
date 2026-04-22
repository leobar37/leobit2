# Plan de Pruebas - Sincronización Offline/Online

## Pre-requisitos
- Servidor backend corriendo (`bun run dev` en packages/backend)
- App frontend corriendo (`bun run dev` en packages/app)
- Usuario logueado con businessId válido

---

## Test 1: Crear Cliente Offline

### Pasos:
1. Abrir app en navegador
2. Ir a DevTools → Network → Set to "Offline"
3. Navegar a "Clientes" → "Nuevo Cliente"
4. Crear un cliente con nombre "Test Offline"
5. Guardar

### Resultado Esperado:
- Cliente aparece en la lista local
- Indicador de sync muestra "1 pendiente"
- Cliente tiene `sync_status = 'pending'` en PGlite

### Verificación:
```javascript
// En DevTools Console:
const { getDatabase } = await import("@avileo/drizzle-sync/client");
const { db } = getDatabase();
const result = await db.execute("SELECT * FROM customers WHERE name = 'Test Offline'");
console.log(result.rows[0].sync_status); // Debe ser 'pending'
```

---

## Test 2: Sincronización al Volver Online

### Pasos:
1. Mantener offline del Test 1
2. Verificar que hay operaciones pendientes:
   ```javascript
   const { getDatabase } = await import("@avileo/drizzle-sync/client");
   const { db } = getDatabase();
   const result = await db.execute("SELECT COUNT(*) FROM sync_operations WHERE status = 'pending'");
   console.log(result.rows[0].count); // Debe ser >= 1
   ```
3. Volver online (Network → Online)
4. Esperar 30 segundos o forzar sync manual

### Resultado Esperado:
- Indicador de sync cambia a "Sincronizando..."
- Luego muestra "Sincronizado"
- Operaciones pendientes pasan a `status = 'completed'`
- Cliente aparece en el backend (verificar en DB o API)

### Verificación Backend:
```bash
# En terminal de backend
cd packages/backend
bun run db:migrate  # Si es necesario
# Verificar que el cliente existe:
bun -e "const { db } = require('./src/lib/db'); db.select().from(require('./src/db/schema').customers).where(eq(require('./src/db/schema').customers.name, 'Test Offline')).then(console.log)"
```

---

## Test 3: Conflicto de Versión (Server Wins)

### Pasos:
1. Crear un cliente online (se sincroniza inmediatamente)
2. Apagar backend o ir offline
3. Editar el cliente localmente (cambiar nombre)
4. En backend (DB directo), editar el mismo cliente (simular otro usuario)
5. Volver online

### Resultado Esperado:
- Se detecta conflicto
- Aparece modal de resolución de conflictos
- Se muestra versión local y versión del servidor
- Al elegir "Usar versión del servidor", se actualiza local

### Verificación:
```javascript
// Verificar que hay conflicto registrado
const { getDatabase } = await import("@avileo/drizzle-sync/client");
const { db } = getDatabase();
const result = await db.execute("SELECT * FROM sync_operations WHERE status = 'conflict'");
console.log(result.rows);
```

---

## Test 4: Venta Atómica (Sale + Items)

### Pasos:
1. Ir a "Nueva Venta"
2. Agregar productos al carrito
3. Seleccionar cliente
4. Finalizar venta (crédito o contado)

### Resultado Esperado:
- Venta se guarda localmente con items
- Se crea un sync_group_id que agrupa venta + items
- Al sincronizar, se envían como batch atómico

### Verificación:
```javascript
// Verificar grupo de sync
const { getDatabase } = await import("@avileo/drizzle-sync/client");
const { db } = getDatabase();
const result = await db.execute(`
  SELECT sync_group_id, entity_type, status 
  FROM sync_operations 
  WHERE entity_type IN ('sales', 'sale_items')
  ORDER BY created_at DESC
  LIMIT 5
`);
console.log(result.rows);
// Debe haber múltiples operaciones con el mismo sync_group_id
```

---

## Test 5: Reintentos con Backoff Exponencial

### Pasos:
1. Ir offline
2. Crear un cliente
3. Volver online pero con backend apagado
4. Esperar que falle el primer intento
5. Verificar reintentos

### Resultado Esperado:
- Primer intento: falla inmediatamente
- Segundo intento: espera ~2 segundos
- Tercer intento: espera ~4 segundos
- etc.

### Verificación:
```javascript
// Verificar intentos
const { getDatabase } = await import("@avileo/drizzle-sync/client");
const { db } = getDatabase();
const result = await db.execute(`
  SELECT id, attempts, last_error, status
  FROM sync_operations
  WHERE status = 'failed'
  ORDER BY attempts DESC
`);
console.log(result.rows);
```

---

## Test 6: Dead Letter Queue (Máximos Reintentos)

### Pasos:
1. Configurar MAX_RETRIES = 2 (temporalmente)
2. Ir offline, crear cliente
3. Volver online con backend apagado
4. Esperar que falle 3 veces

### Resultado Esperado:
- Operación se mueve a `status = 'dead_letter'`
- Aparece en UI como "Error permanente"
- Opción para "Reintentar manualmente"

---

## Checklist de Funcionalidades

### ✅ Core Sync
- [ ] Encolar operaciones cuando está offline
- [ ] Procesar batch cuando vuelve online
- [ ] Reintentos automáticos con backoff
- [ ] Dead letter después de máximos reintentos

### ✅ Conflicto
- [ ] Detectar conflictos de versión
- [ ] Mostrar modal de resolución
- [ ] Aplicar estrategia (server wins / merge)

### ✅ Atomicidad
- [ ] Venta + items se sincronizan juntos
- [ ] Si falla uno, falla todo el grupo

### ✅ UI/UX
- [ ] Indicador de estado de sync visible
- [ ] Contador de operaciones pendientes
- [ ] Toast notifications de éxito/error

---

## Comandos Útiles

### Ver estado de sync en PGlite:
```javascript
const { getDatabase } = await import("@avileo/drizzle-sync/client");
const { db } = getDatabase();

// Contar por estado
const result = await db.execute(`
  SELECT status, COUNT(*) as count 
  FROM sync_operations 
  GROUP BY status
`);
console.table(result.rows);
```

### Forzar sincronización manual:
```javascript
const { getDatabase } = await import("@avileo/drizzle-sync/client");
const { pg } = getDatabase();
const { SyncService } = await import("~/lib/sync/sync-service");

const syncService = new SyncService(pg, "business-id", "token");
await syncService.processBatch();
```

### Limpiar IndexedDB (reset completo):
```javascript
await indexedDB.deleteDatabase("/idb/avileo-pg");
location.reload();
```

---

## Notas

- El sync automático corre cada 5 segundos (SYNC_INTERVAL_MS)
- Batch size máximo es 50 operaciones (BATCH_SIZE)
- Máximo reintentos: 5 (MAX_RETRIES)
- Backoff: 1s, 2s, 4s, 8s, 16s (exponencial)

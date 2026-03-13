# Guía de Ejecución: Migración PGlite

> **Documento Principal** - Cómo ejecutar las tareas sin perderse  
> **Ubicación:** `docs/offline/09-tareas-migracion/MAIN.md`

---

## 🎯 Antes de Empezar

### Skills Disponibles

| Skill | Uso | Cuándo invocar |
|-------|-----|----------------|
| `avileo` | Contexto del proyecto | Siempre al inicio |
| `pglite-sync-migration` | Guía específica de migración | Dudas sobre arquitectura |
| `bun-elysia` | Backend y API | Cuando modifiques backend |
| `frontend` | React, hooks, UI | Tareas 4-5 |
| `fullstack-backend` | Drizzle, DB, servicios | Tareas 1-3 |

**Invocar skill:**
```bash
# Al inicio de cada sesión
skill(name="avileo")
```

## 📋 Orden de Ejecución (NO SALTAR)

```
T0 → T1 → T2 → T3 → T4 → T5 → T6
     ↑____↑    ↑
     (dependencias críticas)
```

**NO empezar T2 sin terminar T0 y T1**
**NO empezar T3 sin terminar T2**

### Duraciones y Checkpoints

| Tarea | Días | Checkpoint Obligatorio |
|-------|------|------------------------|
| **T0** Framework | 3-4 | Diagrama de estados aprobado |
| **T1** Schema | 2-3 | Tablas creadas, PGlite inicia sin error |
| **T2** SyncService | 4-5 | Sync manual funciona (test con 1 operación) |
| **T3** Servicios | 5-6 | SaleService.createWithItems funciona offline |
| **T4** Hooks | 3-4 | useCustomers devuelve datos de PGlite |
| **T5** Rutas | 4-5 | /ventas/nueva funciona 100% offline |
| **T6** Cleanup | 2-3 | TanStack eliminado, app funciona |

---

## ✅ Checklist por Tarea

### T0: Framework de Sync

**Antes de empezar:**
- [ ] Leer `.claude/skills/pglite-sync-migration.md`
- [ ] Revisar documento `00-framework-sync.md`

**Durante:**
- [ ] Definir 6 estados de sync (local, pending, syncing, synced, error, conflict)
- [ ] Definir estrategias de conflicto por entidad
- [ ] Diseñar API de SyncService

**Al terminar - COMPROBAR:**
```typescript
// Verificar que el diseño soporta esto:
const estados = ['local', 'pending', 'syncing', 'synced', 'error', 'conflict'];
const transicionesValidas = {
  'local': ['pending'],
  'pending': ['syncing'],
  'syncing': ['synced', 'error', 'conflict'],
  'error': ['pending'],  // retry
  'conflict': ['pending'],  // after resolution
};
```

**NO HACER:**
- ❌ Implementar aún (solo diseño)
- ❌ Saltarse la definición de conflictos
- ❌ Ignorar el tema de entidades relacionadas

---

### T1: Schema y Tablas

**Antes de empezar:**
- [ ] Tener T0 aprobado
- [ ] Revisar schema actual del backend (`packages/backend/src/db/schema/`)

**Durante:**
- [ ] Crear `sync_operations` PRIMERO
- [ ] Crear tablas de negocio con campos sync
- [ ] Agregar índices en business_id y sync_status

**Al terminar - COMPROBAR:**
```bash
# 1. PGlite inicia sin errores
# 2. En DevTools > Application > IndexedDB:
#    - Debe existir: /idb/avileo-pg
#    - Debe tener: sync_operations + todas las tablas
# 3. Sin errores en consola al iniciar app
```

**NO HACER:**
- ❌ Olvidar campos sync_status, sync_version en tablas
- ❌ Olvidar índices (performance crítica)
- ❌ Crear FKs que impidan sync ( usar lógica en app)

---

### T2: SyncService

**Antes de empezar:**
- [ ] Tener T1 funcionando
- [ ] Revisar `02-sync-service.md`

**Durante:**
- [ ] Implementar `enqueue()`
- [ ] Implementar `processPending()`
- [ ] Implementar `processGroup()`
- [ ] Implementar retry con exponential backoff
- [ ] Crear endpoint `/api/sync/batch` en backend

**Al terminar - COMPROBAR:**
```typescript
// Test manual (DevTools console):
await syncService.enqueue({
  entityType: 'customer',
  entityId: 'test-123',
  syncGroupId: 'group-1',
  operation: 'create',
  payload: { name: 'Test' }
});

// Verificar en PGlite:
// SELECT * FROM sync_operations WHERE entity_id = 'test-123';
// Debe tener status = 'pending'

// Forzar sync:
await syncService.processPending();
// Verificar status cambió a 'synced' (si hay backend)
// O 'error' si no hay conexión
```

**NO HACER:**
- ❌ Llamar API directamente desde servicios (usar solo syncService)
- ❌ Ignorar manejo de errores en batch
- ❌ Olvidar idempotency keys

---

### T3: Servicios de Entidades

**Antes de empezar:**
- [ ] Tener T2 funcionando
- [ ] Revisar `03-servicios-entidades.md`

**Durante:**
- [ ] Crear BaseService con utilidades
- [ ] Implementar CustomerService (CRUD simple)
- [ ] Implementar SaleService (create/update/delete CON items)
- [ ] Implementar PurchaseService (similar a Sale)
- [ ] Implementar ProductService (CRUD simple)

**Al terminar - COMPROBAR:**
```typescript
// Test completo offline:
const sale = await saleService.createWithItems(
  { businessId: 'x', sellerId: 'y', totalAmount: 100 },
  [
    { productId: 'p1', quantity: 2, unitPrice: 50, subtotal: 100 }
  ]
);

// Verificar:
// 1. Sale creada en PGlite (sync_status = 'pending')
// 2. Item creado en PGlite (sync_status = 'pending')
// 3. sync_operations tiene 2 registros con mismo sync_group_id
```

**NO HACER:**
- ❌ Llamar API directamente (siempre local-first)
- ❌ Olvidar version++ en updates
- ❌ Permitir ventas sin items (validar)
- ❌ Usar diferentes sync_group_id para entidades relacionadas

---

### T4: Hooks UI

**Antes de empezar:**
- [ ] Tener T3 funcionando
- [ ] Revisar `04-hooks-ui.md`

**Durante:**
- [ ] Crear ServiceProvider (contexto)
- [ ] Crear hooks useCustomers, useSales, etc.
- [ ] Crear hooks de sync: useSyncStatus

**Al terminar - COMPROBAR:**
```typescript
// En componente React:
const { data: customers } = useCustomers(businessId);
const { pending } = useSyncStatus();

// Verificar:
// 1. customers viene de PGlite (no de API)
// 2. Al crear cliente, se ve inmediatamente (local-first)
// 3. pending muestra cantidad de operaciones pendientes
```

**NO HACER:**
- ❌ Poner lógica de negocio en hooks (debe estar en servicios)
- ❌ Olvidar invalidar cache de React Query
- ❌ Crear hooks que llamen directo a API

---

### T5: Rutas

**Antes de empezar:**
- [ ] Tener T4 funcionando
- [ ] Revisar `05-rutas-ui.md`

**Durante:**
- [ ] Migrar /clientes (list, create, edit)
- [ ] Migrar /ventas/nueva (POS - más crítico)
- [ ] Migrar /productos
- [ ] Crear componente SyncStatus

**Al terminar - COMPROBAR:**
```bash
# Flujo completo offline:
1. Ir a /ventas/nueva
2. Desconectar internet
3. Crear venta con productos
4. Verificar éxito inmediato
5. Verificar sync_status = 'pending'
6. Reconectar internet
7. Verificar sync automático
8. Verificar venta en backend
```

**NO HACER:**
- ❌ Cambiar lógica de UI (solo cambiar fuente de datos)
- ❌ Olvidar manejo de errores de sync
- ❌ Ignorar feedback visual de sync pending

---

### T6: Migración y Cleanup

**Antes de empezar:**
- [ ] Tener T5 funcionando 100%
- [ ] Backup completo de TanStack DB

**Durante:**
- [ ] Ejecutar script de migración de datos
- [ ] Eliminar código de TanStack
- [ ] Eliminar dependencias

**Al terminar - COMPROBAR:**
```bash
# Checklist final:
[ ] Todas las rutas funcionan
[ ] Offline mode funciona
[ ] Sync automático funciona
[ ] No hay referencias a @tanstack/* en imports
[ ] Bundle size reducido
[ ] No hay archivos .collection.ts
```

**NO HACER:**
- ❌ Empezar T6 sin terminar T5 completamente
- ❌ Eliminar TanStack antes de verificar que todo funciona
- ❌ Olvidar hacer backup antes de migrar datos

---

## 🚨 Cómo No Perderse

### Reglas de Oro

1. **UNA TAREA A LA VEZ**
   - No empezar T(n+1) sin terminar T(n)
   - Commit al final de cada tarea

2. **VERIFICAR ANTES DE SEGUIR**
   - Cada tarea tiene "COMPROBAR" section
   - Si falla algo, NO seguir
   - Arreglar antes de continuar

3. **MANTENER TANSTACK VIVO HASTA T6**
   - No eliminar código viejo hasta T6
   - Feature flag opcional si necesitas rollback rápido
   - Comparar comportamiento entre viejo y nuevo

### Señales de Alerta

| Síntoma | Problema | Solución |
|---------|----------|----------|
| Sync no funciona offline | Llamando API directo | Revisar servicios, deben ser local-first |
| Datos no aparecen | Problema en hooks | Verificar useLiveQuery con PGlite |
| Ventas sin items | Sync no atómico | Verificar sync_group_id igual para relacionados |
| Conflictos no detectados | Falta version | Agregar sync_version a tablas |
| Performance lento | Sin índices | Agregar índices en business_id, sync_status |

### Debug Checklist

**Si algo no funciona:**

1. **Verificar PGlite:**
   ```javascript
   // DevTools > Console
   const pg = await indexedDB.open('/idb/avileo-pg');
   console.log(pg);
   ```

2. **Verificar tablas:**
   ```sql
   -- En tu app (temporal)
   const tables = await pg.exec(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
   console.log(tables);
   ```

3. **Verificar sync_operations:**
   ```sql
   SELECT entity_type, entity_id, status, sync_group_id 
   FROM sync_operations 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

4. **Verificar servicio:**
   ```typescript
   // Agregar logs temporales
   console.log('[SaleService] Creating sale:', saleData);
   console.log('[SaleService] Enqueuing sync:', syncOp);
   ```

---

## 📊 Métricas de Éxito

### T0-T2 (Infraestructura)
- [ ] PGlite inicia sin errores
- [ ] sync_operations tiene registros
- [ ] Sync manual funciona

### T3-T4 (Servicios y Hooks)
- [ ] Crear venta offline funciona
- [ ] Datos aparecen inmediatamente
- [ ] useSyncStatus muestra pending > 0

### T5 (UI)
- [ ] /ventas/nueva funciona offline
- [ ] Sync automático al volver online
- [ ] Usuario ve feedback de sync

### T6 (Completo)
- [ ] App funciona sin TanStack
- [ ] Bundle size menor
- [ ] Performance igual o mejor

---

## 🎯 Skill Invocation Guide

**Al inicio de cada sesión:**
```bash
skill(name="avileo")
```

**Cuando tengas dudas de arquitectura:**
```bash
skill(name="pglite-sync-migration")
```

**Cuando modifiques backend:**
```bash
skill(name="bun-elysia")
skill(name="fullstack-backend")
```

**Cuando trabajes en UI:**
```bash
skill(name="frontend")
```

---

## 🚦 Ready to Start?

**Antes de T0:**
- [ ] Leer este documento completo
- [ ] Leer `.claude/skills/pglite-sync-migration.md`
- [ ] Estar listo para 4-5 semanas de trabajo

**Primera acción:**
1. `skill(name="avileo")`
2. Abrir `docs/offline/09-tareas-migracion/00-framework-sync.md`
3. Empezar diseño

---

*Guía creada: 12 de Marzo 2026*  
*Estado: Listo para ejecutar*

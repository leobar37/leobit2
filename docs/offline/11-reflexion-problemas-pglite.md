# Reflexión: Problemas de Implementación de PGlite y ElectricSQL

> Documentado: 2026-03-12
> Contexto: Migración de TanStack DB a PGlite + ElectricSQL

---

## Problemas Identificados

### 1. Error: `column "business_id" does not exist`

**Síntoma**: La aplicación queda en loading infinito después de login.

**Causa Raíz**:
- El orden de inicialización en `db.ts` era incorrecto
- Drizzle se inicializaba ANTES de crear las tablas
- Las tablas existentes en IndexedDB no tenían las columnas correctas
- Las migraciones usaban sintaxis PostgreSQL incompatible con PGlite

**Solución Implementada**:
1. Reordenar inicialización: crear tablas → luego inicializar Drizzle
2. Agregar lógica de auto-reset cuando hay error de schema
3. Migraciones más robustas con `ADD COLUMN IF NOT EXISTS`

**Lección**: El orden de operaciones en bases de datos locales es crítico. Siempre crear estructura primero.

---

### 2. Error: `invalid input syntax for type uuid: "insert-..."`

**Síntoma**: No se podían crear ventas, error de formato UUID.

**Causa Raíz**:
- `generateId()` tenía un fallback que generaba IDs tipo `Date.now()-random`
- El `idempotencyKey` usaba formato `action-entityId-timestamp`
- La columna `id` de `sync_operations` esperaba UUID pero recibía strings

**Solución Implementada**:
1. Eliminar fallback no-UUID de `generateId()`
2. Usar siempre `crypto.randomUUID()`
3. Corregir `idempotencyKey` para usar UUID

**Archivos Modificados**:
- `id-generator.ts`: Solo usar `crypto.randomUUID()`
- `base-service.ts`: UUID para idempotencyKey
- `product-service.ts`: Eliminar sufijo `-var` del ID
- `sync-service.ts`: Siempre generar UUID para ID de operación

**Lección**: Todos los IDs que se usan en PostgreSQL/PGlite deben ser UUIDs válidos. No hay excepciones.

---

### 3. Loading Infinito en ProtectedLayout

**Síntoma**: El spinner nunca desaparece aunque la DB se inicializa.

**Causa Raíz**:
- Las verificaciones `isMounted` causaban que el estado nunca se actualizara
- Si el componente re-renderizaba durante la inicialización, se abortaba silenciosamente

**Solución Implementada**:
- Quitar las protecciones de `isMounted` que bloqueaban actualizaciones de estado
- Permitir que la app cargue aunque haya error

**Lección**: Las verificaciones de "mounted" pueden causar problemas si el componente re-renderiza. En React 18+ con concurrent features, el patrón necesita adaptarse.

---

### 4. Error: "Business seller is not available"

**Síntoma**: Error al intentar crear una venta.

**Causa Raíz**:
- El hook `useCreateDraftSale` accedía `business?.businessUserId` antes de que cargara
- No había validación de estado de carga del negocio

**Solución Implementada**:
- Deshabilitar el botón hasta que `business` esté cargado
- Agregar checks explícitos antes de crear ventas

**Lección**: Siempre verificar estados de loading antes de acceder a datos de queries.

---

## Patrones Estándar Establecidos

### Generación de IDs

```typescript
// ✅ CORRECTO - siempre UUID
import { generateId } from "~/lib/utils/id-generator";
const id = generateId();

// ❌ INCORRECTO - nunca usar
const id = `${Date.now()}-${Math.random()}`;
const id = action + entityId + Date.now();
const id = someId + "-var";
```

### Inicialización de Base de Datos

```typescript
// ✅ CORRECTO - crear tablas primero
await createTables(pgInstance);
const db = drizzle(pgInstance, { schema });

// ❌ INCORRECTO - Drizzle antes de tablas
const db = drizzle(pgInstance, { schema });
await createTables(pgInstance); // Too late!
```

### Manejo de Estado en useEffect

```typescript
// ✅ CORRECTO - permitir updates incluso si re-renderiza
setIsInitialized(true);
setError(new Error(message));

// ❌ INCORRECTO - bloquear con isMounted
if (!isMounted) return;
```

---

## Pendientes / Known Issues

1. **Sincronización de ventas**: La venta se crea localmente pero el sync puede fallar si no hay conexión
2. **Conflictos de schema**: Si el backend cambia el schema, la DB local puede quedar incompatible
3. **Migraciones**: El sistema de migraciones es básico y podría fallar en edge cases

---

## Recomendaciones Futuras

1. **Testing**: Agregar tests unitarios para generación de IDs
2. **Reset de DB**: Agregar botón en UI para resetear IndexedDB manualmente
3. **Validación de schema**: Agregar verificación de compatibilidad schema al iniciar
4. **Logs**: Mantener logs de debug en producción pero filtrados por nivel

---

*Esta reflexión documenta los problemas encontrados durante la implementación de PGlite como base de datos local. El objetivo es evitar repetir estos errores en futuras implementaciones.*

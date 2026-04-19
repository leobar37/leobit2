# Plan Completo: drizzle-sync Configurable Core

## 🎯 Resumen Ejecutivo

Transformar `packages/drizzle-sync` de un paquete específico de Avileo a una **librería genérica de sincronización offline-first** con API declarativa.

### Antes (Hardcodeado)
```typescript
// Entidades hardcodeadas en constants.ts
export const SYNCABLE_ENTITIES = {
  CUSTOMERS: "customers",
  ABONOS: "abonos",  // Español, específico de Avileo
  DISTRIBUCIONES: "distribuciones", // Español
  VISITAS: "visitas", // Español
  // ...14 entidades
};

// Campos hardcodeados en schema-mapper.ts
const TABLE_COLUMNS = {
  distribucion_items: new Set([
    "id", "cantidad_asignada", "cantidad_vendida", // Español
  ]),
  // ...más campos en español
};
```

### Después (Configuración Dinámica)
```typescript
// Nueva API - Totalmente genérica
import { createSyncEngine, defineEntity } from '@avileo/drizzle-sync';

const sync = createSyncEngine({
  entities: {
    customers: defineEntity('customers', {
      tableName: 'customers',
      fields: ['id', 'name', 'email'],
      priority: 1,
      parentFields: ['business_id'],
      selfHeal: true,
      conflictResolver: 'last-write-wins',
      hooks: {
        afterSync: async (entity) => { /* ... */ }
      }
    }),
  }
});
```

## 📋 Tareas del Plan

| ID | Tarea | Tiempo | Prioridad |
|----|-------|--------|-----------|
| T-001 | Crear módulo `config/` con tipos y `defineEntity` | 4h | 🔴 Alta |
| T-002 | Refactorizar tipos genéricos en `core/` | 3h | 🔴 Alta |
| T-003 | Genericizar `HandlerRegistry` en `server/` | 3h | 🔴 Alta |
| T-004 | Crear factory `createSyncEngine` | 4h | 🔴 Alta |
| T-005 | Refactorizar `schema-mapper` para usar config | 4h | 🟡 Media |
| T-006 | Crear preset `avileo.ts` | 2h | 🟡 Media |
| T-007 | Actualizar exports en `index.ts` | 2h | 🟡 Media |
| T-008 | Tests para nuevo sistema | 6h | 🟡 Media |

**Tiempo Total Estimado: 28 horas (3.5 días)**

## 🏗️ Arquitectura Propuesta

```
packages/drizzle-sync/src/
├── config/                      # NUEVO
│   ├── types.ts                 # EntityConfig, SyncEngineConfig
│   ├── entity-definition.ts     # defineEntity(), entityBuilder()
│   ├── validator.ts             # validateConfig(), assertValidConfig()
│   └── index.ts
│
├── create-sync-engine.ts        # NUEVO - Entry point principal
├── sync-engine-instance.ts      # NUEVO - Clase de instancia
│
├── core/                        # REFACTORIZADO
│   ├── types.ts                 # Genérico TEntity
│   ├── interfaces.ts            # Genérico ISyncHandler<TEntity>
│   ├── priority.ts              # Funciones con EntityConfig[]
│   └── ...
│
├── server/                      # REFACTORIZADO
│   ├── types.ts                 # Genérico
│   ├── handler-registry.ts      # Map<string, ...>
│   ├── conflict-resolver.ts     # Genérico
│   └── ...
│
├── pglite/                      # REFACTORIZADO
│   ├── schema-mapper.ts         # createSchemaMapper(config)
│   └── ...
│
├── presets/                     # NUEVO
│   ├── avileo.ts               # Config actual de Avileo
│   └── index.ts
│
└── index.ts                     # ACTUALIZADO - Exports nuevos + legacy
```

## 🔑 Features Clave

### 1. **API Declarativa**
```typescript
const sync = createSyncEngine({
  entities: {
    customers: defineEntity({...}),
    sales: defineEntity({...}),
  },
  handlers: { /* opcional */ },
  conflictResolvers: { /* opcional */ },
  hooks: { /* opcional */ },
});
```

### 2. **Type Safety con Genéricos**
```typescript
type MyEntities = 'customers' | 'sales';
const sync = createSyncEngine<MyEntities>({...});

// Type inference funciona
sync.getEntityConfig('customers'); // ✅
sync.getEntityConfig('invalid');    // ❌ Error de TypeScript
```

### 3. **Validación en Build Time**
```typescript
// Lanza error si config es inválida
assertValidConfig(config);

// Detecta:
// - Entidades faltantes
// - Dependencias circulares
// - Jerarquía de prioridades inválida
// - Campos inconsistentes
```

### 4. **Retrocompatibilidad**
```typescript
// Código existente sigue funcionando
import { SYNCABLE_ENTITIES } from '@avileo/drizzle-sync';
// ↑ Deprecado pero funcional

// Nuevo código usa preset
import { avileoConfig } from '@avileo/drizzle-sync/presets';
const sync = createSyncEngine(avileoConfig);
```

## 📊 Cambios en Estructura de Archivos

### Nuevos Archivos (8)
- `src/config/types.ts` (165 líneas)
- `src/config/entity-definition.ts` (175 líneas)
- `src/config/validator.ts` (160 líneas)
- `src/config/index.ts` (20 líneas)
- `src/create-sync-engine.ts` (235 líneas)
- `src/sync-engine-instance.ts` (280 líneas)
- `src/presets/avileo.ts` (280 líneas)
- `src/presets/index.ts` (10 líneas)

### Archivos Modificados (8)
- `src/core/types.ts` - Genérico
- `src/core/interfaces.ts` - Genérico
- `src/core/priority.ts` - Sin dependencias de @avileo/shared
- `src/core/index.ts` - Exports actualizados
- `src/server/types.ts` - Genérico
- `src/server/handler-registry.ts` - Map<string, ...>
- `src/server/conflict-resolver.ts` - Genérico
- `src/pglite/schema-mapper.ts` - createSchemaMapper(config)
- `src/index.ts` - Nuevos exports

### Archivos Eliminados (0)
- Ninguno (todo se mantiene para retrocompatibilidad, marcado como deprecated)

## ✅ Criterios de Aceptación

1. **Funcionalidad**
   - [ ] `createSyncEngine(config)` crea instancia válida
   - [ ] `defineEntity()` retorna config tipada
   - [ ] `processBatch()` ordena por prioridad
   - [ ] Eventos emitidos correctamente
   - [ ] Hooks ejecutados
   - [ ] Preset de Avileo funciona

2. **Type Safety**
   - [ ] Genéricos inferidos correctamente
   - [ ] No hay `any` en código nuevo
   - [ ] Autocompletado funciona en IDE

3. **Retrocompatibilidad**
   - [ ] Tests antiguos pasan
   - [ ] Exports antiguos funcionan
   - [ ] No breaking changes documentados

4. **Tests**
   - [ ] Cobertura > 80%
   - [ ] Tests de integración pasan
   - [ ] Tests de validación pasan

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Breaking changes en código existente | Media | Alto | Mantener exports legacy, crear preset |
| Pérdida de type safety | Baja | Alto | Usar genéricos consistentemente |
| Performance regression | Baja | Medio | Validar en build time, no runtime |
| Tiempo excedido | Media | Medio | Dividir en fases, priorizar core |

## 🚀 Plan de Ejecución

### Fase 1: Fundación (T-001, T-002)
- Crear sistema de configuración
- Genericizar core types
- **Tiempo: 7 horas**

### Fase 2: Server Core (T-003, T-004)
- Genericizar registries
- Crear factory createSyncEngine
- **Tiempo: 7 horas**

### Fase 3: Integración (T-005, T-006, T-007)
- Schema mapper dinámico
- Preset de Avileo
- Actualizar exports
- **Tiempo: 8 horas**

### Fase 4: Testing (T-008)
- Tests unitarios
- Tests de integración
- Validación
- **Tiempo: 6 horas**

## 📁 Estructura del Plan

```
.opencode/plans/drizzle-sync-configurable-core/
├── context.md                   # Contexto del plan
├── requirements.md              # Requisitos funcionales/no-funcionales
├── task-index.md               # Índice de tareas
├── checklist.json              # Estado de tareas (machine-readable)
└── tasks/
    ├── T-001-config-module.md           # ✅ Completo (implementación completa)
    ├── T-002-generic-types-core.md      # ✅ Completo
    ├── T-003-generic-handler-registry.md # ✅ Completo
    ├── T-004-create-sync-engine.md      # ✅ Completo
    ├── T-005-dynamic-schema-mapper.md   # ✅ Completo (conciso)
    ├── T-006-avileo-preset.md          # ✅ Completo (conciso)
    ├── T-007-update-exports.md          # ✅ Completo (conciso)
    └── T-008-tests.md                   # ✅ Completo (conciso)
```

## 🎓 Ejemplo de Uso Completo

```typescript
// ============================================================
// NUEVA API - Configuración Declarativa
// ============================================================

import { 
  createSyncEngine, 
  defineEntity,
  type SyncOperationInput 
} from '@avileo/drizzle-sync';

// Define tus entidades
type MyEntities = 'users' | 'orders' | 'order_items';

const sync = createSyncEngine<MyEntities>({
  entities: {
    users: defineEntity('users', {
      tableName: 'users',
      fields: ['id', 'name', 'email', 'created_at'],
      priority: 1,
      parentFields: [],
      childEntities: ['orders'],
      selfHeal: true,
      conflictResolver: 'last-write-wins',
    }),
    
    orders: defineEntity('orders', {
      tableName: 'orders',
      fields: ['id', 'user_id', 'total', 'status', 'created_at'],
      priority: 2,
      parentFields: ['user_id'],
      childEntities: ['order_items'],
      selfHeal: false,
      versionField: 'version',
      conflictResolver: 'version-based',
    }),
    
    order_items: defineEntity('order_items', {
      tableName: 'order_items',
      fields: ['id', 'order_id', 'product_id', 'quantity', 'price'],
      priority: 3,
      parentFields: ['order_id'],
      selfHeal: false,
    }),
  },
  
  handlers: {
    // Custom handlers (opcional)
    orders: (deps) => new OrderSyncHandler(deps),
  },
  
  hooks: {
    onPushComplete: async (result) => {
      console.log(`Synced ${result.summary.succeeded} operations`);
    },
    onConflictDetected: async (conflict) => {
      console.warn('Conflict detected:', conflict);
    },
  },
  
  options: {
    batchSize: 100,
    maxRetries: 5,
    logLevel: 'info',
  },
});

// Uso
const operations: SyncOperationInput<MyEntities>[] = [
  {
    idempotencyKey: 'order-123',
    entityType: 'orders',
    entityId: 'order-123',
    operation: 'create',
    payload: { id: 'order-123', user_id: 'user-1', total: 100 },
    localVersion: 1,
    localTimestamp: new Date().toISOString(),
  },
];

const result = await sync.processBatch(context, operations);

// ============================================================
// PRESET DE AVILEO - Para código existente
// ============================================================

import { createSyncEngine } from '@avileo/drizzle-sync';
import { avileoConfig } from '@avileo/drizzle-sync/presets';

const avileoSync = createSyncEngine(avileoConfig);
// ↑ Tiene todas las 16 entidades de Avileo pre-configuradas
```

## 📞 Siguientes Pasos

1. **Revisar Plan**: Validar que el plan cubre todos los requisitos
2. **Priorizar**: Decidir si hacer todo de una vez o por fases
3. **Asignar Recursos**: Estimar cuánto tiempo puedes dedicar
4. **Ejecutar**: Comenzar con T-001 (módulo config/)

## 🤔 Preguntas para el Usuario

1. ¿Quieres mantener **100% retrocompatibilidad** o permitir algunos breaking changes?
2. ¿Prefieres ejecutar **todo de una vez** (3.5 días) o **por fases** (1 fase por semana)?
3. ¿Los **handlers complejos** (SaleSyncHandler, DistribucionSyncHandler) deben migrarse al nuevo sistema o quedarse en backend?
4. ¿El preset de Avileo debe vivir en `drizzle-sync/presets` o en `@avileo/shared`?

---

**Plan creado**: 2024
**Versión**: 1.0.0
**Total de tareas**: 8
**Tiempo estimado total**: 28 horas

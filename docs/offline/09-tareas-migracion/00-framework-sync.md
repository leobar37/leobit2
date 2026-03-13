# Tarea 0: Framework de Sync (Foundation)

> **Estado:** Diseño completo del sistema de sincronización offline-first  
> **Duración:** 3-4 días  
> **Prioridad:** CRÍTICA - Bloquea todas las demás tareas

---

## Objetivo

Diseñar e implementar un **framework de sync robusto** que soporte:
- Sync bidireccional (cliente ↔ servidor)
- 6 estados de sincronización
- Manejo de entidades relacionadas (atómico)
- Resolución de conflictos
- Retry exponencial con dead letter queue

---

## Arquitectura del Framework

### Diagrama de Estados

```
┌────────┐    write     ┌─────────┐    queue      ┌──────────┐
│ LOCAL  │ ───────────▶ │ PENDING │ ────────────▶ │ SYNCING  │
└────────┘              └─────────┘               └──────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────┐
                          ▼                            ▼                    ▼
                   ┌──────────┐               ┌───────────┐          ┌──────────┐
                   │  SYNCED  │               │   ERROR   │          │ CONFLICT │
                   └──────────┘               └───────────┘          └──────────┘
                          │                       │                          │
                          │◀────── retry ────────│                          │ resolve
                          │                       │                          ▼
                          └───────────────────────┴──────────────▶   ┌──────────┐
                            (max 5 attempts)                        │ PENDING  │
                                                                     └──────────┘
```

### Estados del Sync

| Estado | Descripción | Transiciones |
|--------|-------------|--------------|
| **LOCAL** | Entity creada/modificada en PGlite, aún no marcada para sync | → PENDING (cuando se encola) |
| **PENDING** | Lista para enviar al servidor | → SYNCING (cuando inicia envío) |
| **SYNCING** | Enviándose ahora (evita duplicados) | → SYNCED, ERROR, CONFLICT |
| **SYNCED** | Confirmado en servidor | (final) |
| **ERROR** | Falló (network, validation, etc.) | → SYNCING (retry) → DEAD_LETTER (max attempts) |
| **CONFLICT** | Servidor tiene versión diferente | → PENDING (tras resolución) |

---

## Database Schema

### Tabla: `sync_operations` (Write-Ahead Log)

```sql
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  entity_type TEXT NOT NULL,           -- 'sale', 'customer', 'sale_item'
  entity_id UUID NOT NULL,             -- ID de la entidad real
  sync_group_id UUID NOT NULL,         -- Agrupa entidades relacionadas
  
  -- Operación
  operation TEXT NOT NULL,             -- 'create', 'update', 'delete'
  payload JSONB NOT NULL,              -- Datos completos de la entidad
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,  -- Para detección de conflictos
  
  -- Retry
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_attempt_at TIMESTAMP,
  
  -- Idempotencia
  idempotency_key TEXT UNIQUE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_ops_status ON sync_operations(status);
CREATE INDEX idx_sync_ops_group ON sync_operations(sync_group_id);
CREATE INDEX idx_sync_ops_entity ON sync_operations(entity_type, entity_id);
CREATE INDEX idx_sync_ops_pending ON sync_operations(status, attempt_count) 
  WHERE status = 'pending' OR status = 'error';
```

### Campos en Entidades Syncables

Cada tabla que se sincroniza necesita:

```sql
-- Ejemplo: sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... campos de negocio ...
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP,
  sync_error TEXT,
  
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## SyncService API

### Interfaz Principal

```typescript
// services/sync.service.ts

export interface SyncOperation {
  id: string;
  entityType: 'sale' | 'customer' | 'sale_item' | ...;
  entityId: string;
  syncGroupId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  status: SyncStatus;
  version: number;
}

export interface SyncGroup {
  id: string;
  operations: SyncOperation[];
  // Todas las operaciones deben tener éxito o ninguna
}

export class SyncService {
  // Encolar operación (llamado por otros servicios)
  async enqueue(operation: Omit<SyncOperation, 'id'>): Promise<void>;
  
  // Procesar todas las operaciones pendientes
  async processPending(): Promise<SyncResult[]>;
  
  // Procesar un grupo específico
  async processGroup(groupId: string): Promise<SyncResult>;
  
  // Resolver conflicto manualmente
  async resolveConflict(
    operationId: string, 
    resolution: 'server' | 'client' | 'merged',
    mergedData?: Record<string, unknown>
  ): Promise<void>;
  
  // Obtener operaciones con error
  async getFailedOperations(): Promise<SyncOperation[]>;
  
  // Reintentar operación fallida
  async retryOperation(operationId: string): Promise<void>;
  
  // Obtener estado del sync
  getStatus(): {
    pending: number;
    syncing: number;
    error: number;
    conflict: number;
    isProcessing: boolean;
  };
}
```

### Configuración

```typescript
// config/sync.config.ts

export const SYNC_CONFIG = {
  // Retry
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterPercent: 0.2,  // ±20%
  
  // Batch
  batchSize: 50,       // Operaciones por batch
  maxBatchSizeBytes: 1024 * 1024,  // 1MB
  
  // Intervalos
  syncIntervalMs: 30000,  // Auto-sync cada 30s
  
  // Dead letter
  deadLetterAfterAttempts: 5,
};
```

---

## Resolución de Conflictos

### Estrategias por Tipo de Entidad

```typescript
// config/conflict.config.ts

export const CONFLICT_STRATEGIES: Record<EntityType, ConflictStrategy> = {
  // Financial: Server wins (single source of truth)
  'sale': 'server-wins',
  'purchase': 'server-wins',
  'payment': 'server-wins',
  
  // Customer data: Merge fields
  'customer': 'field-merge',
  
  // User preferences: Client wins
  'note': 'client-wins',
  
  // Default
  'default': 'server-wins',
};
```

### Algoritmo de Detección

```typescript
function detectConflict(
  local: { version: number; updatedAt: Date },
  server: { version: number; updatedAt: Date }
): boolean {
  // Primary: Version comparison
  if (local.version !== server.version) {
    return true;
  }
  
  // Secondary: Timestamp sanity check
  const timeDiff = Math.abs(local.updatedAt.getTime() - server.updatedAt.getTime());
  if (timeDiff > 5000) {  // 5 segundos de diferencia sospechosa
    return true;
  }
  
  return false;
}
```

---

## Backend API

### Endpoint: POST /api/sync/batch

```typescript
// Backend - ElysiaJS

interface SyncBatchRequest {
  operations: Array<{
    idempotencyKey: string;
    entityType: string;
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    payload: unknown;
    localVersion: number;
    localTimestamp: string;
  }>;
}

interface SyncBatchResponse {
  results: Array<{
    idempotencyKey: string;
    status: 'success' | 'conflict' | 'error';
    serverVersion?: number;
    serverData?: unknown;
    error?: string;
  }>;
}
```

**Lógica del Backend:**
1. Recibe batch de operaciones
2. Valida idempotency keys (evita duplicados)
3. Para cada operación:
   - Si `operation === 'create'`: INSERT
   - Si `operation === 'update'`: Verificar versión, UPDATE si no hay conflicto
   - Si `operation === 'delete'`: DELETE
4. Retorna resultado por operación
5. Todo en una transacción SQL (ROLLBACK si falla parcialmente)

---

## Manejo de Entidades Relacionadas

### Ejemplo: Venta + Items

```typescript
// services/sale.service.ts

class SaleService {
  async createWithItems(
    sale: CreateSaleInput,
    items: CreateSaleItemInput[]
  ): Promise<Sale> {
    const syncGroupId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // 1. Crear venta en PGlite
    const saleId = crypto.randomUUID();
    await this.db.insert(sales).values({
      id: saleId,
      ...sale,
      sync_status: 'pending',
      sync_version: 1,
      created_at: now,
      updated_at: now,
    });
    
    // 2. Crear items en PGlite
    for (const item of items) {
      await this.db.insert(saleItems).values({
        id: crypto.randomUUID(),
        sale_id: saleId,
        ...item,
        sync_status: 'pending',
        sync_version: 1,
      });
    }
    
    // 3. Crear sync_operations (todo en mismo grupo)
    await this.syncService.enqueue({
      entityType: 'sale',
      entityId: saleId,
      syncGroupId,
      operation: 'create',
      payload: { ...sale, id: saleId },
    });
    
    for (const item of items) {
      await this.syncService.enqueue({
        entityType: 'sale_item',
        entityId: item.id,
        syncGroupId,
        operation: 'create',
        payload: item,
      });
    }
    
    return { id: saleId, ...sale };
  }
}
```

**Regla de Oro:** Todas las entidades relacionadas deben tener el mismo `sync_group_id`. Si una falla, todas se reintentan.

---

## Retry Strategy

```typescript
function calculateRetryDelay(attemptCount: number): number {
  const baseDelay = SYNC_CONFIG.baseDelayMs;
  const multiplier = Math.pow(2, attemptCount - 1);
  const delay = baseDelay * multiplier;
  const cappedDelay = Math.min(delay, SYNC_CONFIG.maxDelayMs);
  
  // Jitter ±20%
  const jitter = cappedDelay * SYNC_CONFIG.jitterPercent * (Math.random() * 2 - 1);
  
  return cappedDelay + jitter;
}

// Intentos:
// 1: ~1000ms
// 2: ~2000ms
// 3: ~4000ms
// 4: ~8000ms
// 5: ~16000ms
// 6: DEAD_LETTER
```

---

## Checklist de Implementación

- [ ] Crear tabla `sync_operations`
- [ ] Agregar campos sync a todas las tablas syncables
- [ ] Implementar `SyncService` con cola y batch processing
- [ ] Implementar lógica de retry con exponential backoff
- [ ] Implementar detección de conflictos
- [ ] Crear endpoint `/api/sync/batch` en backend
- [ ] Implementar resolución de conflictos (UI + lógica)
- [ ] Implementar dead letter queue
- [ ] Testing: Sync offline → online
- [ ] Testing: Conflictos (dos dispositivos, misma entidad)
- [ ] Testing: Retry después de fallo de red
- [ ] Testing: Entidades relacionadas (atomicidad)

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Clock skew | Usar version como source of truth, timestamps solo para display |
| Partial sync | Sync atómico por grupos, rollback si falla |
| Storage lleno | Limpiar sync_operations con status='synced' después de 7 días |
| Duplicados | Idempotency keys únicos |
| Deadlocks | Ordenar operaciones consistentemente (ej: por entity_id) |
| Browser crash | WAL en PGlite (persistido en IndexedDB) |

---

## Notas

- Este framework es la **base de toda la aplicación**. Todas las operaciones de escritura pasan por aquí.
- Los servicios de entidad (SaleService, CustomerService) **no** llaman directamente al API. Siempre escriben a PGlite + encolan sync.
- La UI nunca espera el sync. Muestra éxito inmediatamente y el sync pasa en background.

---

*Documento creado: 12 de Marzo 2026*  
*Framework: Sync completo offline-first*

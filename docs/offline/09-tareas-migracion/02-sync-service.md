# Tarea 2: SyncService y Sync Engine

> **Dependencias:** Tarea 0, Tarea 1  
> **Duración:** 4-5 días  
> **Archivos:** `app/services/sync.service.ts`, Backend API

---

## Objetivo

Implementar el servicio central de sincronización con todas las funcionalidades del framework: batch processing, retry, conflictos, y dead letter queue.

---

## 2.1 SyncService (Frontend)

### Ubicación
`app/services/sync.service.ts`

### Responsabilidades

1. **Encolar operaciones** (cuando entidades cambian)
2. **Procesar batches** (enviar al servidor)
3. **Manejar retry** (exponential backoff)
4. **Resolver conflictos** (UI callbacks)
5. **Dead letter queue** (operaciones fallidas permanentemente)

### Implementación

```typescript
import { eq, and, inArray, desc } from "drizzle-orm";
import type { PGliteDatabase } from "drizzle-orm/pglite";
import { api } from "~/lib/api-client";
import { sync_operations } from "~/engine/schema";
import { SYNC_CONFIG } from "~/config/sync.config";

export type SyncStatus = 'local' | 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';

export interface SyncOperationInput {
  entityType: string;
  entityId: string;
  syncGroupId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  version?: number;
}

export interface SyncResult {
  id: string;
  status: 'success' | 'error' | 'conflict';
  error?: string;
  serverVersion?: number;
  serverData?: Record<string, unknown>;
}

export class SyncService {
  private db: PGliteDatabase;
  private isProcessing = false;
  private abortController: AbortController | null = null;
  private conflictCallback?: (conflict: SyncConflict) => Promise<ConflictResolution>;

  constructor(db: PGliteDatabase) {
    this.db = db;
  }

  // ───────────────────────────────────────────────
  // ENCOLAR OPERACIONES
  // ───────────────────────────────────────────────

  async enqueue(operation: SyncOperationInput): Promise<void> {
    const id = crypto.randomUUID();
    const idempotencyKey = `${operation.entityType}:${operation.entityId}:${Date.now()}`;
    
    await this.db.insert(sync_operations).values({
      id,
      entity_type: operation.entityType,
      entity_id: operation.entityId,
      sync_group_id: operation.syncGroupId,
      operation: operation.operation,
      payload: operation.payload,
      status: 'pending',
      version: operation.version || 1,
      attempt_count: 0,
      idempotency_key: idempotencyKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // ───────────────────────────────────────────────
  // PROCESAR PENDIENTES
  // ───────────────────────────────────────────────

  async processPending(): Promise<SyncResult[]> {
    if (this.isProcessing) {
      console.log("[SyncService] Already processing, skipping");
      return [];
    }

    if (!navigator.onLine) {
      console.log("[SyncService] Offline, cannot process");
      return [];
    }

    this.isProcessing = true;
    this.abortController = new AbortController();
    
    try {
      // 1. Obtener operaciones pendientes agrupadas
      const pending = await this.getPendingOperations();
      
      if (pending.length === 0) {
        return [];
      }

      // 2. Agrupar por sync_group_id
      const groups = this.groupBySyncGroup(pending);
      
      // 3. Procesar cada grupo
      const results: SyncResult[] = [];
      
      for (const group of groups) {
        const groupResults = await this.processGroup(group);
        results.push(...groupResults);
        
        // Abortar si se solicitó
        if (this.abortController.signal.aborted) {
          break;
        }
      }

      return results;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  private async getPendingOperations() {
    return this.db
      .select()
      .from(sync_operations)
      .where(
        and(
          eq(sync_operations.status, 'pending'),
          // Excluir las que están en retry cooldown
          // TODO: Implementar lógica de cooldown
        )
      )
      .orderBy(sync_operations.created_at)
      .limit(SYNC_CONFIG.batchSize);
  }

  private groupBySyncGroup(operations: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    for (const op of operations) {
      const existing = groups.get(op.sync_group_id) || [];
      existing.push(op);
      groups.set(op.sync_group_id, existing);
    }
    
    return groups;
  }

  private async processGroup(operations: any[]): Promise<SyncResult[]> {
    const groupId = operations[0].sync_group_id;
    
    // Marcar como syncing
    for (const op of operations) {
      await this.updateStatus(op.id, 'syncing');
    }

    try {
      // Enviar al backend
      const response = await api.sync.batch.post({
        operations: operations.map(op => ({
          idempotencyKey: op.idempotency_key,
          entityType: op.entity_type,
          entityId: op.entity_id,
          operation: op.operation,
          payload: op.payload,
          localVersion: op.version,
          localTimestamp: op.created_at,
        })),
      });

      if (response.error) {
        throw new Error(String(response.error));
      }

      const results = response.data as SyncResult[];

      // Procesar resultados
      for (const result of results) {
        const op = operations.find(o => o.id === result.id);
        
        if (!op) continue;

        switch (result.status) {
          case 'success':
            await this.markAsSynced(op.id, result.serverVersion);
            break;
          case 'conflict':
            await this.handleConflict(op, result);
            break;
          case 'error':
            await this.markAsError(op.id, result.error);
            break;
        }
      }

      return results;
    } catch (error) {
      // Error de red o servidor - marcar todo el grupo como error
      for (const op of operations) {
        await this.markAsError(op.id, String(error));
      }
      throw error;
    }
  }

  // ───────────────────────────────────────────────
  // MANEJO DE ESTADOS
  // ───────────────────────────────────────────────

  private async updateStatus(id: string, status: SyncStatus) {
    await this.db
      .update(sync_operations)
      .set({
        status,
        updated_at: new Date().toISOString(),
      })
      .where(eq(sync_operations.id, id));
  }

  private async markAsSynced(id: string, serverVersion?: number) {
    await this.db
      .update(sync_operations)
      .set({
        status: 'synced',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(sync_operations.id, id));

    // También actualizar la entidad real
    // TODO: Actualizar sync_status en tabla de entidad
  }

  private async markAsError(id: string, error: string) {
    const operation = await this.db
      .select()
      .from(sync_operations)
      .where(eq(sync_operations.id, id))
      .then(rows => rows[0]);

    const newAttemptCount = (operation?.attempt_count || 0) + 1;
    
    await this.db
      .update(sync_operations)
      .set({
        status: newAttemptCount >= SYNC_CONFIG.maxAttempts ? 'error' : 'pending',
        attempt_count: newAttemptCount,
        last_error: error,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(sync_operations.id, id));
  }

  // ───────────────────────────────────────────────
  // MANEJO DE CONFLICTOS
  // ───────────────────────────────────────────────

  private async handleConflict(
    operation: any,
    result: SyncResult
  ): Promise<void> {
    await this.db
      .update(sync_operations)
      .set({
        status: 'conflict',
        updated_at: new Date().toISOString(),
      })
      .where(eq(sync_operations.id, operation.id));

    // Si hay callback de conflicto, invocarlo
    if (this.conflictCallback) {
      const resolution = await this.conflictCallback({
        operation,
        serverData: result.serverData,
        serverVersion: result.serverVersion,
      });

      await this.resolveConflict(operation.id, resolution);
    }
  }

  async resolveConflict(
    operationId: string,
    resolution: 'server' | 'client' | 'merged',
    mergedData?: Record<string, unknown>
  ): Promise<void> {
    if (resolution === 'server') {
      // Aceptar versión del servidor
      await this.db
        .update(sync_operations)
        .set({ status: 'synced' })
        .where(eq(sync_operations.id, operationId));
    } else if (resolution === 'client') {
      // Reintentar con versión actualizada
      await this.db
        .update(sync_operations)
        .set({
          status: 'pending',
          version: (await this.getOperation(operationId)).version + 1,
        })
        .where(eq(sync_operations.id, operationId));
    } else if (resolution === 'merged' && mergedData) {
      // Usar datos mergeados
      await this.db
        .update(sync_operations)
        .set({
          status: 'pending',
          payload: mergedData,
        })
        .where(eq(sync_operations.id, operationId));
    }
  }

  // ───────────────────────────────────────────────
  // DEAD LETTER QUEUE
  // ───────────────────────────────────────────────

  async getFailedOperations(): Promise<any[]> {
    return this.db
      .select()
      .from(sync_operations)
      .where(
        and(
          eq(sync_operations.status, 'error'),
          // Intentos máximos alcanzados
          // TODO: Agregar columna dead_letter_at
        )
      )
      .orderBy(desc(sync_operations.updated_at));
  }

  async retryOperation(operationId: string): Promise<void> {
    await this.db
      .update(sync_operations)
      .set({
        status: 'pending',
        attempt_count: 0,
        last_error: null,
      })
      .where(eq(sync_operations.id, operationId));
  }

  // ───────────────────────────────────────────────
  // UTILIDADES
  // ───────────────────────────────────────────────

  getStatus() {
    // TODO: Implementar contadores por status
    return {
      isProcessing: this.isProcessing,
      pending: 0,
      syncing: 0,
      error: 0,
      conflict: 0,
    };
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  onConflict(callback: (conflict: any) => Promise<any>) {
    this.conflictCallback = callback;
  }

  private async getOperation(id: string) {
    return this.db
      .select()
      .from(sync_operations)
      .where(eq(sync_operations.id, id))
      .then(rows => rows[0]);
  }
}
```

---

## 2.2 Backend API

### Endpoint: POST /api/sync/batch

**Ubicación:** `packages/backend/src/api/sync.ts`

```typescript
import { Elysia, t } from "elysia";

export const syncRoutes = new Elysia({ prefix: "/sync" })
  .post("/batch", async ({ body, ctx }) => {
    const { operations } = body;
    
    return await db.transaction(async (tx) => {
      const results = [];
      
      for (const op of operations) {
        try {
          // Verificar idempotencia
          const existing = await tx.query.sync_operations.findFirst({
            where: eq(sync_operations.idempotency_key, op.idempotencyKey),
          });
          
          if (existing) {
            results.push({
              idempotencyKey: op.idempotencyKey,
              status: 'success',
              message: 'Already processed',
            });
            continue;
          }
          
          // Verificar conflicto de versión
          const entity = await getEntity(tx, op.entityType, op.entityId);
          
          if (entity && entity.version > op.localVersion) {
            results.push({
              idempotencyKey: op.idempotencyKey,
              status: 'conflict',
              serverVersion: entity.version,
              serverData: entity,
            });
            continue;
          }
          
          // Aplicar operación
          const result = await applyOperation(tx, op);
          
          // Registrar idempotencia
          await tx.insert(sync_operations).values({
            idempotency_key: op.idempotencyKey,
            processed_at: new Date(),
          });
          
          results.push({
            idempotencyKey: op.idempotencyKey,
            status: 'success',
            serverVersion: result.version,
          });
          
        } catch (error) {
          results.push({
            idempotencyKey: op.idempotencyKey,
            status: 'error',
            error: String(error),
          });
        }
      }
      
      return { results };
    });
  }, {
    body: t.Object({
      operations: t.Array(t.Object({
        idempotencyKey: t.String(),
        entityType: t.String(),
        entityId: t.String(),
        operation: t.Enum(['create', 'update', 'delete']),
        payload: t.Unknown(),
        localVersion: t.Number(),
        localTimestamp: t.String(),
      })),
    }),
  });
```

---

## 2.3 Auto-Sync

### Inicialización

```typescript
// app/engine/provider.tsx

useEffect(() => {
  // Sync automático cada 30 segundos
  const interval = setInterval(() => {
    if (navigator.onLine) {
      syncService.processPending();
    }
  }, SYNC_CONFIG.syncIntervalMs);
  
  // Sync cuando vuelve online
  const handleOnline = () => {
    syncService.processPending();
  };
  
  window.addEventListener('online', handleOnline);
  
  return () => {
    clearInterval(interval);
    window.removeEventListener('online', handleOnline);
    syncService.stop();
  };
}, []);
```

---

## Checklist

- [ ] SyncService con enqueue/processPending
- [ ] Agrupación por sync_group_id
- [ ] Marcar operaciones como syncing/synced/error
- [ ] Retry con exponential backoff
- [ ] Manejo de conflictos (callback)
- [ ] Dead letter queue
- [ ] Backend endpoint /api/sync/batch
- [ ] Idempotency keys en backend
- [ ] Auto-sync cada 30s y al volver online
- [ ] Tests: Batch sync, Retry, Conflict

---

## Dependencias

- Tarea 0 (diseño del framework)
- Tarea 1 (tablas sync_operations creadas)

## Bloquea

- Tarea 3 (servicios de entidades usan SyncService)

---

*Complejidad: ALTA*  
*Riesgo: Framework crítico para toda la app*

# Fase 8: Sync Engine

> Motor de sincronización offline/online

---

## 🎯 Objetivo

Sincronizar datos locales con el servidor cuando hay internet.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│  OPERACIÓN LOCAL (IndexedDB)            │
│  ├─ Guardar en colección                │
│  └─ Agregar a syncQueue                 │
└─────────────────────────────────────────┘
                   │
                   ▼ (Cuando hay internet)
┌─────────────────────────────────────────┐
│  SYNC ENGINE                            │
│  1. Leer cola de operaciones            │
│  2. Enviar al servidor (orden FIFO)     │
│  3. Marcar como 'synced' si éxito       │
│  4. Reintentar si falla (max 5)         │
└─────────────────────────────────────────┘
```

---

## 💻 Implementación

### Sync Queue

```typescript
// apps/web/src/lib/sync/syncQueue.ts
import { db } from '../db/indexeddb'

interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  collection: string
  data: any
  attempts: number
  lastError?: string
  createdAt: number
}

class SyncQueue {
  private async getQueue(): Promise<SyncOperation[]> {
    return (await db.loadCollection('syncQueue')) || []
  }

  async add(operation: Omit<SyncOperation, 'attempts' | 'createdAt'>) {
    const queue = await this.getQueue()
    queue.push({
      ...operation,
      attempts: 0,
      createdAt: Date.now()
    })
    await db.saveCollection('syncQueue', queue)
  }

  async process() {
    if (!navigator.onLine) return

    const queue = await this.getQueue()
    const token = localStorage.getItem('token')
    
    if (!token) return

    for (const op of queue) {
      if (op.attempts >= 5) continue

      try {
        const response = await fetch(`/api/sync/${op.collection}`, {
          method: op.type === 'create' ? 'POST' : op.type === 'update' ? 'PUT' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(op.data)
        })

        if (response.ok) {
          // Marcar como sync'd en la colección original
          await this.markAsSynced(op.collection, op.data.id)
          // Eliminar de la cola
          await this.remove(op.id)
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        op.attempts++
        op.lastError = error instanceof Error ? error.message : 'Unknown error'
        await this.update(op)
      }
    }
  }

  private async markAsSynced(collection: string, id: string) {
    const data = await db.loadCollection(collection)
    const item = data?.find((i: any) => i.id === id)
    if (item) {
      item.syncStatus = 'synced'
      await db.saveItem(collection, id, item)
    }
  }

  private async remove(id: string) {
    const queue = await this.getQueue()
    const filtered = queue.filter(op => op.id !== id)
    await db.saveCollection('syncQueue', filtered)
  }

  private async update(operation: SyncOperation) {
    const queue = await this.getQueue()
    const index = queue.findIndex(op => op.id === operation.id)
    if (index >= 0) {
      queue[index] = operation
      await db.saveCollection('syncQueue', queue)
    }
  }

  getPendingCount(): Promise<number> {
    return this.getQueue().then(q => q.length)
  }
}

export const syncQueue = new SyncQueue()
```

### Hook useSync

```typescript
// apps/web/src/hooks/useSync.ts
import { useState, useEffect, useCallback } from 'react'
import { syncQueue } from '@/lib/sync/syncQueue'
import { useConnection } from './useConnection'

export function useSync() {
  const { isOnline } = useConnection()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    updatePendingCount()
  }, [])

  useEffect(() => {
    if (isOnline) {
      sync()
    }
  }, [isOnline])

  const updatePendingCount = async () => {
    const count = await syncQueue.getPendingCount()
    setPendingCount(count)
  }

  const sync = useCallback(async () => {
    if (!isOnline || isSyncing) return
    
    setIsSyncing(true)
    await syncQueue.process()
    await updatePendingCount()
    setIsSyncing(false)
  }, [isOnline, isSyncing])

  return {
    isOnline,
    isSyncing,
    pendingCount,
    sync
  }
}
```

### Componente SyncStatus

```typescript
// apps/web/src/components/SyncStatus.tsx
import { useSync } from '@/hooks/useSync'
import { Wifi, WifiOff, RotateCcw } from 'lucide-react'

export function SyncStatus() {
  const { isOnline, isSyncing, pendingCount, sync } = useSync()

  if (isOnline && pendingCount === 0) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <Wifi className="w-4 h-4" />
        <span>Sincronizado</span>
      </div>
    )
  }

  if (isOnline && pendingCount > 0) {
    return (
      <button
        onClick={sync}
        disabled={isSyncing}
        className="flex items-center gap-2 text-yellow-400 text-sm"
      >
        <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{pendingCount} pendientes</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      <WifiOff className="w-4 h-4" />
      <span>Offline</span>
    </div>
  )
}
```

---

## ✅ Tests

1. Crear venta offline
2. Verificar aparece en syncQueue
3. Conectar internet
4. Verificar sync automático
5. Verificar venta marcada como 'synced'

---

## 📦 Entregable

- [ ] SyncQueue con persistencia
- [ ] Hook useSync
- [ ] Componente SyncStatus
- [ ] Sync automático al reconectar
- [ ] Reintentos con backoff

---

## 🔄 Siguiente Paso

→ Ve a `../09-reportes/README.md`

# Avileo - Implementación Offline con TanStack DB

> Arquitectura offline-first usando TanStack DB + IndexedDB + Sync personalizado (sin RxDB de pago)

---

## 🎯 El Problema con RxDB

RxDB tiene funcionalidades **open source** pero también tiene:
- Plugins premium de pago
- Limitaciones en la versión gratuita
- Licencia comercial para uso empresarial

**Solución:** Implementar nuestra propia capa de persistencia con TanStack DB nativo.

---

## 🏗️ Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISPOSITIVO DEL VENDEDOR                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  REACT APP                                              │    │
│  │  ├─ Components (UI)                                     │    │
│  │  ├─ Configuración del Sistema (modo de operación)      │    │
│  │  ├─ TanStack Query (cache HTTP)                        │    │
│  │  └─ TanStack DB (estado reactivo)                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────┐    │
│  │  TANSTACK DB COLLECTIONS                                 │    │
│  │  ├─ ventasCollection (SIEMPRE)                          │    │
│  │  ├─ clientesCollection (SIEMPRE)                        │    │
│  │  ├─ configuracionCollection (modo de operación)        │    │
│  │  ├─ inventarioCollection (OPCIONAL)                    │    │
│  │  └─ syncQueueCollection (cola de operaciones)          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────┐    │
│  │  PERSISTENCIA INDEXEDDB (nuestra implementación)        │    │
│  │  ├─ Guarda colecciones en IndexedDB                     │    │
│  │  ├─ Carga al iniciar la app                             │    │
│  │  └─ Escucha cambios y persiste automáticamente          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────┐    │
│  │  SYNC ENGINE (nuestra implementación)                   │    │
│  │  ├─ Detecta cambios en colecciones                      │    │
│  │  ├─ Si hay internet: envía al servidor                  │    │
│  │  ├─ Si NO hay internet: guarda en cola                  │    │
│  │  └─ Reintenta cuando vuelve la conexión                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │      CONEXIÓN (HTTP/REST)     │
                    └───────────────┬───────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────┐
│                         SERVIDOR                                 │
│  ├─ API REST (Node.js/Express)                                  │
│  ├─ PostgreSQL (fuente de verdad)                               │
│  ├─ Configuración del sistema (modo de operación)              │
│  └─ WebSocket opcional (para sync en tiempo real)               │
└─────────────────────────────────────────────────────────────────┘
```

### Flexibilidad: Modos de Operación

El sistema soporta múltiples modos que se configuran en el servidor:

```typescript
// Configuración del sistema (guardada en servidor)
interface SystemConfig {
  modo_operacion: 'inventario_propio' | 'sin_inventario' | 'pedidos' | 'mixto'
  control_kilos: boolean           // true = valida stock
  usar_distribucion: boolean       // true = usa distribución del día
  permitir_venta_sin_stock: boolean // true = vende sin asignación
}

// Las colecciones que se usan dependen del modo:
// - SIEMPRE: ventas, clientes, configuracion, syncQueue
// - OPCIONAL (modo inventario): inventario, distribuciones
```

---

## 📦 Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| **UI** | React + TanStack Query | Interfaz y cache HTTP |
| **Estado** | TanStack DB | Colecciones reactivas |
| **Persistencia** | IndexedDB API nativa | Almacenamiento local |
| **Sync** | Custom Sync Engine | Nuestra implementación |
| **Cola Offline** | `@tanstack/offline-transactions` | Persistir mutaciones |

---

## 🔧 Implementación Paso a Paso

### Paso 1: Instalación

```bash
npm install @tanstack/react-db @tanstack/query-db-collection @tanstack/offline-transactions
```

**NO necesitas:**
- `rxdb` (tiene cosas de pago)
- `@tanstack/rxdb-db-collection` (bridge a RxDB)

---

### Paso 2: Persistencia con IndexedDB

Creamos nuestro propio persister:

```typescript
// lib/db/persister.ts
import { get, set, del, keys } from 'idb-keyval'

export interface PersistedCollection {
  name: string
  data: any[]
  lastSync: number | null
}

export class IndexedDBPersister {
  private dbName: string

  constructor(dbName: string = 'pollospro-db') {
    this.dbName = dbName
  }

  // Guardar una colección completa
  async persistCollection(name: string, data: any[]): Promise<void> {
    const key = `${this.dbName}:${name}`
    await set(key, {
      name,
      data,
      lastSync: Date.now()
    })
  }

  // Cargar una colección
  async loadCollection(name: string): Promise<any[] | null> {
    const key = `${this.dbName}:${name}`
    const stored = await get<PersistedCollection>(key)
    return stored?.data || null
  }

  // Cargar todas las colecciones
  async loadAllCollections(): Promise<Record<string, any[]>> {
    const allKeys = await keys()
    const collections: Record<string, any[]> = {}

    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(this.dbName)) {
        const collectionName = key.replace(`${this.dbName}:`, '')
        const data = await this.loadCollection(collectionName)
        if (data) {
          collections[collectionName] = data
        }
      }
    }

    return collections
  }

  // Limpiar todo
  async clearAll(): Promise<void> {
    const allKeys = await keys()
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(this.dbName)) {
        await del(key)
      }
    }
  }
}

export const dbPersister = new IndexedDBPersister()
```

---

### Paso 3: Crear Colecciones con Persistencia

```typescript
// lib/db/collections.ts
import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { dbPersister } from './persister'

// Esquemas simples (puedes usar Zod para validación)
export const ventaSchema = {
  id: 'string',
  clienteId: 'string?',
  vendedorId: 'string',
  total: 'number',
  tipoPago: 'string', // 'contado' | 'credito'
  productos: 'array',
  fecha: 'string',
  syncStatus: 'string', // 'synced' | 'pending' | 'error'
  createdAt: 'number'
}

export const clienteSchema = {
  id: 'string',
  dni: 'string',
  nombre: 'string',
  telefono: 'string?',
  direccion: 'string?',
  saldo: 'number',
  totalComprado: 'number',
  totalPagado: 'number',
  syncStatus: 'string',
  updatedAt: 'number'
}

// Colección de ventas con persistencia
export const ventasCollection = createCollection(
  queryCollectionOptions({
    id: 'ventas',
    queryKey: ['ventas'],
    queryFn: async () => {
      // 1. Primero intentar cargar de IndexedDB
      const localData = await dbPersister.loadCollection('ventas')
      
      // 2. Si hay internet, también fetch del servidor
      if (navigator.onLine) {
        try {
          const serverData = await fetch('/api/ventas/hoy').then(r => r.json())
          // Merge: servidor tiene prioridad para datos sync'd
          const merged = mergeLocalAndServer(localData || [], serverData)
          await dbPersister.persistCollection('ventas', merged)
          return merged
        } catch (e) {
          // Si falla, usar datos locales
          return localData || []
        }
      }
      
      // 3. Sin internet: usar solo datos locales
      return localData || []
    },
    getKey: (item) => item.id,
    schema: ventaSchema,
    syncMode: 'eager' // Carga todo upfront
  })
)

// Colección de clientes
export const clientesCollection = createCollection(
  queryCollectionOptions({
    id: 'clientes',
    queryKey: ['clientes'],
    queryFn: async () => {
      const localData = await dbPersister.loadCollection('clientes')
      
      if (navigator.onLine) {
        try {
          const serverData = await fetch('/api/clientes').then(r => r.json())
          const merged = mergeLocalAndServer(localData || [], serverData)
          await dbPersister.persistCollection('clientes', merged)
          return merged
        } catch (e) {
          return localData || []
        }
      }
      
      return localData || []
    },
    getKey: (item) => item.id,
    schema: clienteSchema,
    syncMode: 'eager'
  })
)

// Función para mergear datos locales y del servidor
function mergeLocalAndServer(local: any[], server: any[]): any[] {
  const merged = new Map()
  
  // Primero poner todos los del servidor
  server.forEach(item => merged.set(item.id, { ...item, syncStatus: 'synced' }))
  
  // Luego mergear los locales (los pendientes tienen prioridad)
  local.forEach(item => {
    if (item.syncStatus === 'pending' || item.syncStatus === 'error') {
      merged.set(item.id, item) // Local gana si está pendiente
    }
  })
  
  return Array.from(merged.values())
}
```

---

### Paso 4: Sync Engine Personalizado

```typescript
// lib/db/syncEngine.ts
import { dbPersister } from './persister'

interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  collection: string
  data: any
  timestamp: number
  attempts: number
  lastError?: string
}

class SyncEngine {
  private syncQueue: SyncOperation[] = []
  private isSyncing = false

  constructor() {
    // Cargar cola pendiente al iniciar
    this.loadQueue()
    
    // Escuchar cambios de conexión
    window.addEventListener('online', () => this.onConnectionRestored())
    window.addEventListener('offline', () => this.onConnectionLost())
  }

  // Agregar operación a la cola
  async queueOperation(op: Omit<SyncOperation, 'timestamp' | 'attempts'>): Promise<void> {
    const operation: SyncOperation = {
      ...op,
      timestamp: Date.now(),
      attempts: 0
    }
    
    this.syncQueue.push(operation)
    await this.saveQueue()
    
    // Intentar sync inmediatamente si hay conexión
    if (navigator.onLine) {
      this.processQueue()
    }
  }

  // Procesar la cola de operaciones
  private async processQueue(): Promise<void> {
    if (this.isSyncing || !navigator.onLine || this.syncQueue.length === 0) {
      return
    }

    this.isSyncing = true

    // Procesar en orden FIFO
    while (this.syncQueue.length > 0 && navigator.onLine) {
      const operation = this.syncQueue[0]
      
      try {
        await this.syncOperation(operation)
        
        // Éxito: remover de la cola
        this.syncQueue.shift()
        await this.saveQueue()
        
        // Emitir evento de éxito
        this.emitSyncEvent('success', operation)
        
      } catch (error) {
        operation.attempts++
        operation.lastError = error.message
        
        if (operation.attempts >= 3) {
          // Máximo de intentos alcanzado
          this.syncQueue.shift() // Mover a cola de errores
          await this.saveQueue()
          this.emitSyncEvent('max_retries', operation)
        } else {
          // Reintentar más tarde
          this.emitSyncEvent('retry', operation)
          break
        }
      }
    }

    this.isSyncing = false
  }

  // Sincronizar una operación individual
  private async syncOperation(op: SyncOperation): Promise<void> {
    const endpoint = `/api/${op.collection}`
    
    let method = 'POST'
    if (op.type === 'update') method = 'PUT'
    if (op.type === 'delete') method = 'DELETE'

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op.data)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  // Cuando vuelve la conexión
  private onConnectionRestored(): void {
    console.log('🌐 Conexión restaurada. Iniciando sync...')
    this.processQueue()
  }

  // Cuando se pierde la conexión
  private onConnectionLost(): void {
    console.log('📴 Sin conexión. Operaciones se guardarán localmente.')
  }

  // Persistir cola en IndexedDB
  private async saveQueue(): Promise<void> {
    await dbPersister.persistCollection('__syncQueue', this.syncQueue)
  }

  // Cargar cola de IndexedDB
  private async loadQueue(): Promise<void> {
    const queue = await dbPersister.loadCollection('__syncQueue')
    this.syncQueue = queue || []
  }

  // Eventos para la UI
  private emitSyncEvent(type: string, operation: SyncOperation): void {
    window.dispatchEvent(new CustomEvent('sync-event', {
      detail: { type, operation }
    }))
  }

  // Obtener estado del sync
  getStatus() {
    return {
      pending: this.syncQueue.filter(op => op.attempts < 3).length,
      errors: this.syncQueue.filter(op => op.attempts >= 3).length,
      isSyncing: this.isSyncing,
      isOnline: navigator.onLine
    }
  }
}

export const syncEngine = new SyncEngine()
```

---

### Paso 5: Registrar Venta (Offline/Online)

```typescript
// hooks/useVentas.ts
import { useLiveQuery } from '@tanstack/react-db'
import { ventasCollection } from '../lib/db/collections'
import { syncEngine } from '../lib/db/syncEngine'
import { dbPersister } from '../lib/db/persister'
import { generateUUID } from '../lib/utils'

export function useVentas() {
  // Query reactiva que se actualiza automáticamente
  const { data: ventas, isLoading } = useLiveQuery((q) =>
    q.from({ ventas: ventasCollection })
      .orderBy(({ ventas }) => ventas.createdAt, 'desc')
  )

  // Registrar nueva venta
  const registrarVenta = async (ventaData: Omit<Venta, 'id' | 'syncStatus' | 'createdAt'>) => {
    const nuevaVenta = {
      id: generateUUID(),
      ...ventaData,
      syncStatus: 'pending',
      createdAt: Date.now()
    }

    // 1. Guardar en TanStack DB (reactivo, UI se actualiza)
    await ventasCollection.insert(nuevaVenta)

    // 2. Persistir en IndexedDB
    const ventasActuales = await dbPersister.loadCollection('ventas') || []
    await dbPersister.persistCollection('ventas', [...ventasActuales, nuevaVenta])

    // 3. Agregar a cola de sync
    await syncEngine.queueOperation({
      id: nuevaVenta.id,
      type: 'create',
      collection: 'ventas',
      data: nuevaVenta
    })

    return nuevaVenta
  }

  // Obtener ventas pendientes de sync
  const getVentasPendientes = () => {
    return ventas?.filter(v => v.syncStatus === 'pending') || []
  }

  return {
    ventas: ventas || [],
    isLoading,
    registrarVenta,
    getVentasPendientes,
    syncStatus: syncEngine.getStatus()
  }
}
```

---

### Paso 6: Componente de Venta con Estado Offline

```tsx
// components/RegistrarVenta.tsx
import { useState } from 'react'
import { useVentas } from '../hooks/useVentas'

export function RegistrarVenta() {
  const { registrarVenta, syncStatus } = useVentas()
  const [monto, setMonto] = useState('')
  const [cliente, setCliente] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    await registrarVenta({
      clienteId: cliente || null,
      vendedorId: 'vendedor-actual', // del auth context
      total: parseFloat(monto),
      tipoPago: 'contado',
      productos: [{ nombre: 'Pollo', cantidad: 1, precio: parseFloat(monto) }],
      fecha: new Date().toISOString()
    })

    // Limpiar formulario
    setMonto('')
    setCliente('')
    
    // Mostrar feedback
    if (!syncStatus.isOnline) {
      alert('✅ Venta guardada localmente. Se sincronizará cuando haya internet.')
    } else {
      alert('✅ Venta registrada y sincronizada.')
    }
  }

  return (
    <div>
      {/* Indicador de conexión */}
      <div className={`status-badge ${syncStatus.isOnline ? 'online' : 'offline'}`}>
        {syncStatus.isOnline ? '🟢 En línea' : '📴 Sin conexión'}
        {syncStatus.pending > 0 && ` • ${syncStatus.pending} pendientes`}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto de la venta"
        />
        <input
          type="text"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Cliente (opcional)"
        />
        <button type="submit">
          Registrar Venta
        </button>
      </form>
    </div>
  )
}
```

---

### Paso 7: Hook de Conexión

```typescript
// hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingOps, setPendingOps] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    // Escuchar cambios de conexión
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Escuchar eventos de sync
    const handleSyncEvent = (e: CustomEvent) => {
      if (e.detail.type === 'success' || e.detail.type === 'retry') {
        // Actualizar contador de pendientes
        updatePendingCount()
      }
    }
    window.addEventListener('sync-event', handleSyncEvent as EventListener)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('sync-event', handleSyncEvent as EventListener)
    }
  }, [])

  const updatePendingCount = async () => {
    // Obtener de syncEngine
    const status = syncEngine.getStatus()
    setPendingOps(status.pending)
  }

  return { isOnline, pendingOps }
}
```

---

## 🔄 Flujo Completo

### 1. Vendedor sin internet hace una venta:

```
1. Completa formulario → Clic en "Registrar"
2. TanStack DB guarda en memoria (UI se actualiza)
3. IndexedDB persiste localmente
4. SyncEngine detecta: NO hay internet
5. Guarda en cola de operaciones pendientes
6. Muestra: "Venta guardada localmente ✓"
```

### 2. Vendedor con internet hace una venta:

```
1. Completa formulario → Clic en "Registrar"
2. TanStack DB guarda en memoria
3. IndexedDB persiste localmente
4. SyncEngine detecta: SÍ hay internet
5. Envía al servidor inmediatamente
6. Servidor confirma → Marca como 'synced'
7. Muestra: "Venta sincronizada ✓"
```

### 3. Vuelve la conexión después de estar offline:

```
1. Browser detecta: 'online' event
2. SyncEngine.processQueue() se ejecuta
3. Envía operaciones pendientes en orden
4. Por cada éxito: remueve de cola, actualiza UI
5. Si falla: incrementa intentos, reintenta luego
```

---

## 📊 Comparación: RxDB vs Nuestra Solución

| Característica | RxDB (pago) | Nuestra Solución |
|----------------|-------------|------------------|
| **Persistencia** | ✅ Incluida | ✅ IndexedDB + idb-keyval |
| **Sync automático** | ✅ Incluido | ⚠️ Custom (lo creamos nosotros) |
| **Conflict resolution** | ✅ Incluido | ⚠️ Implementación simple |
| **Multi-tab** | ✅ Incluido | ⚠️ Service Worker necesario |
| **Reactivity** | ✅ RxJS | ✅ TanStack DB nativo |
| **Offline mutations** | ✅ Incluido | ✅ @tanstack/offline-transactions |
| **Precio** | 💰 Tiene premium | 🆓 100% gratis |
| **Control** | Limitado por RxDB | Total control del código |

---

## ⚠️ Limitaciones y Consideraciones

### 1. **Sync no es automático como RxDB**
- Necesitamos implementar el sync engine nosotros
- Más código que mantener
- Pero: control total del comportamiento

### 2. **Conflict resolution básico**
- Nuestra implementación: "último que escribe gana"
- RxDB tiene algoritmos más sofisticados
- Para Avileo: el caso de uso es simple (ventas independientes)

### 3. **Multi-tab sync**
- Con RxDB: automático
- Nuestra solución: necesita BroadcastChannel API o Service Worker
- Para v1: puede no ser crítico (un vendedor = un dispositivo)

---

## ✅ Ventajas de esta Aproximación

1. **100% gratis** - Sin licencias ni premium
2. **Control total** - Entiendes cada línea de código
3. **TanStack ecosystem** - Integración perfecta con Query, Router, etc.
4. **Simple** - Menos magia, más explícito
5. **Escalable** - Puedes mejorar el sync engine gradualmente

---

## 🚀 Próximos Pasos

1. Implementar colecciones básicas (ventas, clientes)
2. Probar flujo offline en desarrollo
3. Agregar Service Worker para background sync
4. Implementar multi-tab sync (si es necesario)
5. Testing en dispositivos reales con mala conexión

---

## 📚 Recursos

- [TanStack DB Docs](https://tanstack.com/db/latest)
- [idb-keyval](https://github.com/jakearchibald/idb-keyval) - Wrapper simple de IndexedDB
- [@tanstack/offline-transactions](https://tanstack.com/db/latest/docs/framework/react/guides/offline-transactions)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)

---

*Implementación 100% open source, sin dependencias de pago.*

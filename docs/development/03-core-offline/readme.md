# Fase 3: Core Offline

> Infraestructura base: IndexedDB, TanStack DB, persistencia local

---

## 🎯 Objetivo

Construir la base para que la app funcione **100% offline**:
- Persistencia en IndexedDB
- Estado reactivo con TanStack DB
- Detección de conexión
- Estructura de datos local

---

## 📋 Requisitos Previos

- Fase 1 y 2 completadas
- Entender el concepto de offline-first

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│           REACT APP                      │
│  ├─ TanStack DB (estado en memoria)    │
│  └─ UI Components                        │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│     INDEXEDDB (persistencia)           │
│  ├─ ventas                              │
│  ├─ clientes                            │
│  ├─ configuracion                       │
│  └─ syncQueue                           │
└─────────────────────────────────────────┘
```

---

## 💻 Implementación

### Paso 1: Instalar Dependencias

```bash
cd apps/web
npm install idb-keyval
npm install @tanstack/react-db
```

### Paso 2: Configurar IndexedDB

```typescript
// apps/web/src/lib/db/indexeddb.ts
import { get, set, del, keys } from 'idb-keyval'

const DB_PREFIX = 'pollospro'

export const db = {
  // Guardar colección completa
  async saveCollection<T>(name: string, data: T[]): Promise<void> {
    await set(`${DB_PREFIX}:${name}`, data)
  },

  // Cargar colección
  async loadCollection<T>(name: string): Promise<T[] | null> {
    return await get<T[]>(`${DB_PREFIX}:${name}`)
  },

  // Guardar item individual
  async saveItem<T>(collection: string, id: string, item: T): Promise<void> {
    const data = (await this.loadCollection<T>(collection)) || []
    const index = data.findIndex((i: any) => i.id === id)
    
    if (index >= 0) {
      data[index] = item
    } else {
      data.push(item)
    }
    
    await this.saveCollection(collection, data)
  },

  // Eliminar item
  async deleteItem(collection: string, id: string): Promise<void> {
    const data = (await this.loadCollection(collection)) || []
    const filtered = data.filter((i: any) => i.id !== id)
    await this.saveCollection(collection, filtered)
  },

  // Listar todas las colecciones
  async listCollections(): Promise<string[]> {
    const allKeys = await keys()
    return allKeys
      .filter(k => typeof k === 'string' && k.startsWith(DB_PREFIX))
      .map(k => (k as string).replace(`${DB_PREFIX}:`, ''))
  },

  // Limpiar todo
  async clear(): Promise<void> {
    const cols = await this.listCollections()
    for (const col of cols) {
      await del(`${DB_PREFIX}:${col}`)
    }
  }
}
```

### Paso 3: TanStack DB Collections

```typescript
// apps/web/src/lib/db/collections.ts
import { createCollection } from '@tanstack/react-db'
import { db } from './indexeddb'

// Tipos
export interface Venta {
  id: string
  clientId: string | null
  sellerId: string
  totalAmount: number
  saleType: 'contado' | 'credito'
  syncStatus: 'pending' | 'synced' | 'error'
  createdAt: number
}

export interface Cliente {
  id: string
  name: string
  dni: string
  phone?: string
  debt: number
  syncStatus: 'pending' | 'synced' | 'error'
  createdAt: number
}

// Colección de Ventas
export const ventasCollection = createCollection<Venta>({
  name: 'ventas',
  initialData: [],
  persistence: {
    save: (data) => db.saveCollection('ventas', data),
    load: () => db.loadCollection('ventas')
  }
})

// Colección de Clientes
export const clientesCollection = createCollection<Cliente>({
  name: 'clientes',
  initialData: [],
  persistence: {
    save: (data) => db.saveCollection('clientes', data),
    load: () => db.loadCollection('clientes')
  }
})

// Colección de Configuración
export const configCollection = createCollection({
  name: 'configuracion',
  initialData: {
    modoOperacion: 'inventario_propio',
    controlKilos: true,
    usarDistribucion: true
  },
  persistence: {
    save: (data) => db.saveCollection('configuracion', [data]),
    load: async () => {
      const data = await db.loadCollection('configuracion')
      return data?.[0]
    }
  }
})
```

### Paso 4: Hook de Conexión

```typescript
// apps/web/src/hooks/useConnection.ts
import { useState, useEffect } from 'react'

export function useConnection() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
```

### Paso 5: Provider de DB

```typescript
// apps/web/src/contexts/DBContext.tsx
import { createContext, useContext, useEffect } from 'react'
import { 
  ventasCollection, 
  clientesCollection,
  configCollection 
} from '@/lib/db/collections'

const DBContext = createContext({
  ventas: ventasCollection,
  clientes: clientesCollection,
  config: configCollection
})

export function DBProvider({ children }: { children: React.ReactNode }) {
  // Cargar datos al iniciar
  useEffect(() => {
    ventasCollection.load()
    clientesCollection.load()
    configCollection.load()
  }, [])

  return (
    <DBContext.Provider value={{
      ventas: ventasCollection,
      clientes: clientesCollection,
      config: configCollection
    }}>
      {children}
    </DBContext.Provider>
  )
}

export const useDB = () => useContext(DBContext)
```

---

## ✅ Tests

### Test Manual

1. Abrir app
2. Verificar en DevTools > Application > IndexedDB:
   - [ ] Se creó la base "pollospro"
   - [ ] Hay colecciones: ventas, clientes, configuracion

3. Desconectar internet
4. Recargar página
5. Verificar:
   - [ ] La app carga datos desde IndexedDB
   - [ ] No hay errores de red

---

## 📦 Entregable

- [ ] IndexedDB configurado con idb-keyval
- [ ] Colecciones de TanStack DB
- [ ] Persistencia automática
- [ ] Hook useConnection
- [ ] DBContext provider

---

## 🔄 Siguiente Paso

→ Ve a `../04-ventas/README.md`

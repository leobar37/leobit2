# Avileo - Plan Técnico (Arquitectura Offline-First)

> Sistema de gestión para negocios de pollo con soporte offline para vendedores en zonas sin cobertura.

**Versión:** 2.0 - Offline First  
**Última actualización:** 7 de febrero de 2026

---

## 🎯 Problema Crítico Identificado

Los vendedores trabajan en:
- Carros por calles con cobertura intermitente
- Mercados con mala señal
- Zonas rurales
- **No pueden depender de conexión constante**

**Solución: Arquitectura Offline-First**

---

## 🏗️ Arquitectura Offline-First

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DISPOSITIVO DEL VENDEDOR                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  APP (React PWA)                                            │    │
│  │  ├─ UI Components                                           │    │
│  │  ├─ TanStack Query (cacheo y estado)                       │    │
│  │  └─ TanStack Store / RxDB (base de datos local)            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  DATABASE LOCAL (IndexedDB/SQLite)                          │    │
│  │  ├─ Ventas pendientes de sync                               │    │
│  │  ├─ Clientes cacheados                                      │    │
│  │  ├─ Inventario asignado                                     │    │
│  │  └─ Cola de operaciones offline                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  SYNC ENGINE (Background Sync / Service Worker)             │    │
│  │  ├─ Detecta cambios locales                                 │    │
│  │  ├─ Intenta enviar al servidor                              │    │
│  │  ├─ Reintenta en caso de fallo                              │    │
│  │  └─ Resuelve conflictos (último gana / merge manual)        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │         CONEXIÓN              │
                    │      (Cuando disponible)      │
                    └───────────────┬───────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                         SERVIDOR (Cloud)                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  API REST (Node.js)                                         │    │
│  │  ├─ Auth endpoints                                          │    │
│  │  ├─ Sync endpoints (batch operations)                       │    │
│  │  └─ Conflict resolution                                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  POSTGRESQL (Fuente de verdad)                              │    │
│  │  └─ Datos oficiales de todos los vendedores                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📱 Flujo de Trabajo Offline

### Escenario 1: Vendedor con Internet (Sync Normal)

```
1. Vendedor hace una venta
2. Se guarda en IndexedDB local
3. Sync Engine detecta cambio
4. Hay internet → Envía inmediatamente al servidor
5. Servidor confirma → Marca como sync'd
6. Listo ✅
```

### Escenario 2: Vendedor Sin Internet (Modo Offline)

```
1. Vendedor hace una venta
2. Se guarda en IndexedDB local
3. Sync Engine detecta: NO hay internet
4. Guarda en "Cola de Pendientes"
5. Muestra indicador: "Pendiente de sincronizar"
6. Vendedor continúa vendiendo normalmente
7. Cuando vuelve la conexión → Sync automático
8. Resuelve conflictos si los hay
```

### Escenario 3: Cierre del Día (Reporte Offline)

```
1. Vendedor termina su jornada
2. App calcula totales desde IndexedDB local:
   - Total vendido hoy
   - Kilos vendidos
   - Dinero recaudado
3. Intenta enviar cierre al servidor
4. Si no hay internet → Guarda para luego
5. Admin puede ver "Cierres pendientes" en panel
```

---

## 🔄 Estrategia de Sincronización

### 1. Sync en Tiempo Real (Cuando hay internet)

```typescript
// TanStack Query con staleTime y cacheTime configurados
const { data } = useQuery({
  queryKey: ['clientes'],
  queryFn: fetchClientes,
  staleTime: 1000 * 60 * 5, // 5 minutos
  cacheTime: 1000 * 60 * 30, // 30 minutos
  networkMode: 'offlineFirst' // Intenta cache primero
})
```

### 2. Background Sync (Cuando vuelve la conexión)

```typescript
// Service Worker para sync en background
self.addEventListener('sync', event => {
  if (event.tag === 'sync-ventas') {
    event.waitUntil(syncVentasPendientes())
  }
})
```

### 3. Cola de Operaciones Offline

```typescript
// Estructura de operación pendiente
interface OperacionPendiente {
  id: string           // UUID local
  tipo: 'venta' | 'cliente' | 'abono'
  datos: any           // Datos de la operación
  timestamp: number    // Cuándo se creó
  intentos: number     // Cuántas veces se intentó sync
  estado: 'pendiente' | 'syncing' | 'error'
  error?: string       // Mensaje de error si falló
}
```

### 4. Resolución de Conflictos

**Estrategia: "Último que escribe gana" + Notificación**

```
Caso: Dos vendedores venden al mismo cliente offline

Vendedor A (offline): Vende 5kg a las 10:00 AM
Vendedor B (offline): Vende 3kg a las 11:00 AM

Cuando sync:
1. Servidor recibe venta A → La procesa
2. Servidor recibe venta B → La procesa
3. Saldo del cliente = Saldo anterior + 5kg + 3kg
4. Ambas ventas son válidas ✅

No hay conflicto porque son operaciones independientes.
```

**Caso de conflicto real:**
```
Vendedor A edita Cliente X (cambia teléfono)
Vendedor B edita Cliente X (cambia dirección)
Ambos offline, mismo cliente.

Solución: Merge automático si campos diferentes
Si mismo campo → Último timestamp gana
Notificar al admin que hubo edición concurrente
```

---

## 🗄️ Base de Datos Local (Dispositivo)

### Opciones Técnicas

| Opción | Pros | Contras |
|--------|------|---------|
| **IndexedDB + Dexie.js** | Nativo del navegador, buen soporte | API verbosa, necesita wrapper |
| **RxDB** | Reactive, sync automático, offline-first | Curva de aprendizaje, bundle size |
| **PouchDB** | Sync con CouchDB, maduro | Menos popular ahora |
| **SQLite (via WASM)** | SQL completo, transacciones | Más pesado, setup complejo |
| **TanStack Store** | Nuevo, integrado con Query, reactivo | Muy nuevo, menos documentación |

### Recomendación: **RxDB**

Por qué RxDB es ideal para este caso:

1. **Offline-first por diseño** - No es un add-on, es el core
2. **Sync automático** - Se conecta a CouchDB/GraphQL y synca solo
3. **Reactive** - La UI se actualiza automáticamente cuando cambian datos
4. **Conflict resolution built-in** - Maneja conflictos de forma elegante
5. **Multi-tab support** - Funciona bien en PWA
6. **Encryption** - Puede encriptar datos sensibles localmente

```typescript
// Ejemplo RxDB
import { createRxDatabase } from 'rxdb'

const db = await createRxDatabase({
  name: 'pollospro',
  storage: getRxStorageIndexedDB()
})

// Colección de ventas
const ventasCollection = await db.addCollections({
  ventas: {
    schema: ventasSchema,
    sync: {
      remote: 'http://servidor.com/sync/ventas',
      options: { live: true, retry: true }
    }
  }
})

// La magia: sync automático cuando hay internet
// Cuando no hay, guarda local y reintenta
```

---

## 📊 Datos que se guardan Local vs Servidor

### Datos Locales (IndexedDB/RxDB)

| Dato | Por qué local |
|------|---------------|
| **Ventas del día** | El vendedor debe poder vender sin internet |
| **Clientes frecuentes** | Búsqueda rápida sin esperar servidor |
| **Inventario asignado** | Saber cuánto tiene para vender |
| **Precios actuales** | Calcular montos correctamente |
| **Cola de operaciones** | Pendientes de sincronizar |

### Datos Solo en Servidor (PostgreSQL)

| Dato | Por qué servidor |
|------|------------------|
| **Historial completo** | No cabe en el móvil, consulta bajo demanda |
| **Reportes admin** | Solo admin los ve, no urgentes |
| **Todos los clientes** | Cachear solo los frecuentes localmente |
| **Configuración del sistema** | Cambios raros, fetch cuando hay internet |

---

## 🔄 Flujo de Sync Detallado

```
┌──────────────────────────────────────────────────────────────┐
│                    INICIO DEL DÍA                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  1. VENDEDOR ABRE APP (con o sin internet)                   │
│     ├─ Si hay internet:                                      │
│     │   └─ Descarga: inventario asignado, clientes, precios  │
│     │                                                       │
│     └─ Si NO hay internet:                                   │
│         └─ Usa datos cacheados de ayer                       │
│         └─ Muestra: "Usando datos offline"                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  2. DURANTE EL DÍA (modo offline)                            │
│     ├─ Vendedor hace ventas normalmente                      │
│     ├─ Cada venta se guarda en IndexedDB                     │
│     ├─ App intenta sync en background                        │
│     └─ Si falla, queda en cola para reintentar               │
│                                                              │
│     Indicadores visuales:                                    │
│     🟢 Sync OK  |  🟡 Sync pendiente  |  🔴 Error de sync    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  3. CIERRE DEL DÍA                                          │
│     ├─ Vendedor genera reporte de cierre                    │
│     ├─ Se calcula desde datos locales:                      │
│     │   Total vendido, kilos, recaudación                   │
│     └─ Intenta enviar cierre al servidor                    │
│                                                              │
│     Si NO hay internet:                                      │
│     └─ Guarda cierre como "pendiente"                       │
│     └─ Admin ve en panel: "Cierres pendientes: 3"           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  4. CUANDO VUELVE INTERNET                                  │
│     ├─ Sync Engine detecta conexión                         │
│     ├─ Envía operaciones pendientes en orden                │
│     ├─ Resuelve conflictos si los hay                       │
│     ├─ Recibe confirmaciones del servidor                   │
│     └─ Actualiza UI: "Sync completado ✓"                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Manejo de Errores

### Escenarios de Error y Soluciones

| Escenario | Solución |
|-----------|----------|
| **Sync falla temporalmente** | Reintentar con backoff exponencial (1s, 2s, 4s, 8s...) |
| **Sync falla permanentemente** | Guardar en "Cola de errores", notificar admin |
| **Conflicto de datos** | Mostrar ambas versiones, dejar que admin elija |
| **Datos corruptos localmente** | Limpiar cache, re-descargar desde servidor |
| **Dispositivo perdido/roto** | Datos en servidor están seguros, reinstalar app |

### Indicadores de Estado para el Vendedor

```
┌─────────────────────────────────────┐
│  🟢 Todo sincronizado               │
│  Último sync: Hace 2 minutos        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🟡 3 operaciones pendientes        │
│  Se sincronizarán automáticamente   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🔴 Error de sincronización         │
│  Toca para reintentar               │
└─────────────────────────────────────┘
```

---

## 📱 Implementación Técnica (Código)

### 1. Detección de Conexión

```typescript
// Hook para detectar estado de conexión
function useNetworkStatus() {
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
  
  return isOnline
}
```

### 2. Guardar Operación (Offline/Online)

```typescript
async function registrarVenta(ventaData) {
  // 1. Siempre guardar local primero
  const ventaLocal = await db.ventas.insert({
    ...ventaData,
    id: generateUUID(),
    syncStatus: 'pending',
    createdAt: Date.now()
  })
  
  // 2. Intentar sync si hay internet
  if (navigator.onLine) {
    try {
      await syncVentaAlServidor(ventaLocal)
      await ventaLocal.update({ syncStatus: 'synced' })
      showToast('Venta guardada ✓')
    } catch (error) {
      await ventaLocal.update({ syncStatus: 'error', error: error.message })
      showToast('Venta guardada localmente, se sincronizará luego')
    }
  } else {
    showToast('Modo offline - Venta guardada localmente')
  }
  
  return ventaLocal
}
```

### 3. Sync en Background

```typescript
// Service Worker para background sync
// sw.js

self.addEventListener('sync', event => {
  if (event.tag === 'sync-ventas-pendientes') {
    event.waitUntil(
      (async () => {
        const ventasPendientes = await db.ventas
          .find({ syncStatus: 'pending' })
          .exec()
        
        for (const venta of ventasPendientes) {
          try {
            await fetch('/api/ventas', {
              method: 'POST',
              body: JSON.stringify(venta),
              headers: { 'Content-Type': 'application/json' }
            })
            await venta.update({ syncStatus: 'synced' })
          } catch (error) {
            console.error('Sync falló:', error)
            // Se reintentará en el próximo sync
          }
        }
      })()
    )
  }
})

// Registrar sync desde la app
async function requestBackgroundSync() {
  const registration = await navigator.serviceWorker.ready
  await registration.sync.register('sync-ventas-pendientes')
}
```

### 4. TanStack Query con Offline Support

```typescript
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Siempre intenta cache primero
      networkMode: 'offlineFirst',
      // Mantén datos en cache por 24 horas
      cacheTime: 1000 * 60 * 60 * 24,
      // Considera datos frescos por 5 minutos
      staleTime: 1000 * 60 * 5,
      // Reintenta 3 veces si falla
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    },
    mutations: {
      // Las mutaciones también funcionan offline
      networkMode: 'offlineFirst',
      retry: 3
    }
  }
})
```

---

## 🧪 Testing de Escenarios Offline

### Casos de Prueba

| # | Escenario | Resultado Esperado |
|---|-----------|-------------------|
| 1 | Vendedor sin internet hace 5 ventas | Las 5 se guardan local, indicador muestra "5 pendientes" |
| 2 | Vuelve internet | Sync automático, indicador cambia a "Sincronizado" |
| 3 | Internet intermitente (va y viene) | Reintentos automáticos, no pierde datos |
| 4 | Dos vendedores venden al mismo cliente offline | Ambas ventas se registran, saldo se suma correctamente |
| 5 | Vendedor cierra app y vuelve a abrir | Datos locales persisten, estado se mantiene |
| 6 | Vendedor cambia de dispositivo | Al login, descarga sus datos del servidor |

---

## 📋 Checklist de Implementación Offline

### Fase 1: Setup Base
- [ ] Configurar Service Worker
- [ ] Implementar detección de conexión
- [ ] Elegir e integrar RxDB/IndexedDB
- [ ] Crear esquemas de datos locales

### Fase 2: Operaciones Offline
- [ ] Guardar ventas localmente
- [ ] Guardar clientes localmente
- [ ] Implementar cola de operaciones
- [ ] Crear indicadores de sync status

### Fase 3: Sync
- [ ] Implementar sync en tiempo real
- [ ] Implementar background sync
- [ ] Manejar errores de sync
- [ ] Resolver conflictos

### Fase 4: Testing
- [ ] Probar sin internet
- [ ] Probar con internet intermitente
- [ ] Probar recuperación de errores
- [ ] Probar en dispositivos reales

---

## 🎓 Recursos Adicionales

### Documentación Oficial
- [RxDB](https://rxdb.info/) - Base de datos offline-first
- [TanStack Query](https://tanstack.com/query/latest) - Estado y cacheo
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### Artículos Recomendados
- "Offline-First Web Applications" - Google Developers
- "Building Offline-First Apps with RxDB"
- "Service Workers: An Introduction"

---

## 💡 Ventajas de esta Arquitectura

1. **Vendedores nunca se detienen** - Pueden vender sin internet
2. **Datos siempre disponibles** - Clientes, precios, inventario local
3. **Resiliente** - Si falla el servidor, los vendedores siguen trabajando
4. **Rápido** - No esperan respuesta del servidor para cada operación
5. **Económico** - Menos consumo de datos móviles

---

*Este documento actualiza el plan técnico original con arquitectura Offline-First, crítica para vendedores que trabajan en zonas sin cobertura.*

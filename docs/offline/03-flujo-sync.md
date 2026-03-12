# Flujo de Sincronización

> Diagramas detallados de cómo fluye la data en cada escenario

## Tabla de Contenidos
1. [Flujo 1: Crear Venta (Online)](#flujo-1-crear-venta-online)
2. [Flujo 2: Crear Venta (Offline)](#flujo-2-crear-venta-offline)
3. [Flujo 3: Lectura de Datos](#flujo-3-lectura-de-datos)
4. [Flujo 4: Conflicto de Edición](#flujo-4-conflicto-de-edición)
5. [Flujo 5: Sync Inicial](#flujo-5-sync-inicial)

---

## Flujo 1: Crear Venta (Online)

### Timeline Completa

```
T+0ms    Usuario hace clic en "Crear Venta"
         │
         ├─ UI muestra spinner "Creando..."
         │
         └─ POST /api/sales
            Headers:
              Authorization: Bearer <token>
              Content-Type: application/json
            Body:
              {
                "customerId": "cust-123",
                "items": [
                  { "productId": "prod-1", "qty": 2, "price": 50 },
                  { "productId": "prod-2", "qty": 1, "price": 25 }
                ],
                "total": 125.00,
                "paymentMethod": "efectivo"
              }

T+50ms   Backend recibe request
         │
         ├─ Middleware: Valida JWT
         ├─ Middleware: Extrae businessId del token
         ├─ Handler: Valida datos con Zod schema
         └─ Inicia transacción PostgreSQL

T+100ms  Transacción PostgreSQL
         │
         ├─ BEGIN
         ├─ INSERT INTO sales (id, business_id, customer_id, total, status)
         │   VALUES ('sale-789', 'biz-abc', 'cust-123', 125.00, 'active')
         │
         ├─ INSERT INTO sale_items (sale_id, product_id, qty, price)
         │   VALUES ('sale-789', 'prod-1', 2, 50),
         │          ('sale-789', 'prod-2', 1, 25)
         │
         ├─ INSERT INTO payments (sale_id, amount, method)
         │   VALUES ('sale-789', 125.00, 'efectivo')
         │
         └─ COMMIT

T+150ms  PostgreSQL commit exitoso
         │
         ├─ ElectricSQL (vía logical replication) detecta cambios
         ├─ Prepara batch de actualizaciones
         └─ Responde al cliente: HTTP 200 OK
            Body: { "id": "sale-789", "status": "active", ... }

T+200ms  Cliente recibe HTTP 200
         │
         ├─ UI muestra "Venta creada exitosamente"
         └─ Redirige a detalle de venta (optimistic navigation)

T+250ms  ElectricSQL propaga cambios
         │
         ├─ Envía diff a todos los clientes suscritos
         ├─ Cliente actual (creador) recibe sus propios cambios
         └─ Otros vendedores del mismo negocio reciben update

T+300ms  Cliente aplica cambios
         │
         ├─ Electric inserta en PGlite local:
         │   - 1 fila en 'sales'
         │   - 2 filas en 'sale_items'
         │   - 1 fila en 'payments'
         │
         └─ useLiveQuery detecta cambio en PGlite

T+350ms  UI actualiza
         │
         ├─ React re-render con nuevos datos
         ├─ Venta ya aparece en listado
         └─ Estado financiero actualizado

TOTAL: ~350ms end-to-end
```

### Diagrama de Secuencia

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Usuario │    │  React   │    │   API    │    │ Postgres │    │ Electric │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ Click "Crear" │               │               │               │
     │──────────────>│               │               │               │
     │               │ POST /sales   │               │               │
     │               │──────────────>│               │               │
     │               │               │ Validar       │               │
     │               │               │──────────────>│               │
     │               │               │               │ BEGIN         │
     │               │               │               │ INSERT x4     │
     │               │               │               │ COMMIT        │
     │               │               │               │──────────────>│
     │               │               │ 200 OK        │               │
     │               │<──────────────│               │               │
     │               │               │               │               │ Detecta
     │               │               │               │               │──────────>
     │               │               │               │               │ Propaga
     │               │<──────────────────────────────────────────────│
     │               │ useLiveQuery  │               │               │
     │               │ detecta cambio│               │               │
     │               │───────────┐   │               │               │
     │               │           │   │               │               │
     │               │<──────────┘   │               │               │
     │ Re-render     │               │               │               │
     │<──────────────│               │               │               │
     │               │               │               │               │
```

---

## Flujo 2: Crear Venta (Offline)

### Timeline Completa

```
T+0s     Usuario hace clic en "Crear Venta"
         │
         ├─ UI muestra "Creando..."
         └─ POST /api/sales iniciado

T+2s     fetch() falla (timeout)
         │
         ├─ Error: "Network request failed"
         ├─ Detectado: navigator.onLine === false
         └─ Cambia a modo offline

T+3s     Guardar en queue
         │
         └─ IndexedDB.open('write-queue')
            └─ objectStore('pending').add({
                 id: "write-uuid-123",
                 endpoint: "/api/sales",
                 method: "POST",
                 body: { customerId, items, total, ... },
                 attempts: 0,
                 createdAt: Date.now()
               })

T+4s     UI actualiza
         │
         ├─ Muestra badge "Pendiente de sincronización"
         ├─ Venta aparece en lista con indicador offline
         └─ Toast: "Se guardará cuando haya conexión"

+5min    Usuario sigue trabajando
         │
         ├─ Crea 3 ventas más (todas en queue)
         ├─ IndexedDB ahora tiene 4 writes pendientes
         └─ UI muestra "4 cambios pendientes"

+7min    Conexión restaurada
         │
         ├─ window 'online' event dispara
         └─ Auto-trigger processWriteQueue()

+7.1s    Procesar queue
         │
         ├─ Lee todos los pending writes de IndexedDB
         ├─ Ordena por createdAt (FIFO)
         └─ Para cada write:
             ├─ Intenta POST
             ├─ Éxito → elimina de IndexedDB
             └─ Fallo → incrementa attempts, reintenta luego

+8s      Queue procesada
         │
         ├─ 4/4 writes exitosos
         ├─ IndexedDB vacío
         └─ UI actualiza: "Sincronizado"

+8.5s    Electric sync
         │
         ├─ Backend ahora tiene 4 ventas nuevas
         ├─ Electric detecta 4 INSERTs
         └─ Propaga a cliente (incluyendo al creador)

+9s      UI final
         │
         ├─ Ventas cambian de "Pendiente" a "Sincronizado"
         └─ IDs reales asignados por backend

TOTAL: Variable según duración offline
```

### Diagrama de Estados

```
┌──────────────┐
│   ONLINE     │
└──────┬───────┘
       │ fetch()
       │ falla
       ▼
┌──────────────┐
│   OFFLINE    │
└──────┬───────┘
       │ Guarda en
       │ IndexedDB
       ▼
┌──────────────┐
│  QUEUED      │ ◄── Usuario ve "Pendiente"
└──────┬───────┘
       │ 'online'
       │ event
       ▼
┌──────────────┐
│  SYNCING     │ ◄── Procesando queue
└──────┬───────┘
       │ Éxito
       ▼
┌──────────────┐
│   SYNCED     │ ◄── Electric confirma
└──────────────┘
       │
       │ Error
       │ persistente
       ▼
┌──────────────┐
│    ERROR     │ ◄── Requiere intervención
└──────────────┘
```

---

## Flujo 3: Lectura de Datos

### Secuencia Normal

```
Componente monta
    │
    ├─ useEffect inicia
    │
    ├─ useLiveQuery(db.select().from(sales))
    │   │
    │   ├─ Drizzle genera SQL
    │   ├─ Ejecuta en PGlite local
    │   └─ Retorna datos actuales
    │
    ├─ React renderiza con datos
    │
    └─ Suscribe a cambios en PGlite
        │
        └─ Cuando Electric actualiza PGlite
            │
            ├─ Trigger de cambio detectado
            ├─ useLiveQuery re-ejecuta
            └─ React re-renderiza
```

### Ventajas de este patrón

| Aspecto | Comportamiento |
|---------|---------------|
| **Velocidad** | < 10ms (local query) |
| **Tiempo real** | Automático vía Electric |
| **Offline** | Funciona siempre (datos locales) |
| **Consistencia** | Siempre ve datos del mismo business |

---

## Flujo 4: Conflicto de Edición

### Escenario

- **Usuario A**: Edita cliente offline (cambia teléfono)
- **Usuario B**: Edita mismo cliente online (cambia dirección)
- **Usuario A**: Vuelve online, sync su cambio

### Resolución

```
T+0      User A (offline)
         ├─ Cambia phone: "123" → "456"
         ├─ Guarda en queue
         └─ timestamp: 2025-03-11T10:00:00Z

T+1min   User B (online)
         ├─ Cambia address: "Calle A" → "Calle B"
         ├─ POST /api/customers/123
         └─ timestamp: 2025-03-11T10:01:00Z

T+1min   Postgres actualizado (User B)
         ├─ Electric detecta
         └─ Propaga a todos (incluido User A si estuviera online)

T+5min   User A vuelve online
         ├─ Queue procesada
         ├─ POST /api/customers/123 con phone="456"
         └─ timestamp: 2025-03-11T10:05:00Z (más reciente)

T+5min   Backend resuelve
         ├─ phone: "456" (User A, más reciente)
         ├─ address: "Calle B" (User B, único cambio)
         └─ Resultado: merged

T+5.1min Electric propaga
         ├─ User A ve: phone="456", address="Calle B" ✓
         └─ User B ve: phone="456", address="Calle B" ✓
```

### Estrategia: Last-Write-Wins por Campo

```typescript
// Backend merge strategy
function mergeCustomer(existing, changes, timestamp) {
  return {
    ...existing,
    ...changes,
    updatedAt: timestamp // Siempre actualizar timestamp
  };
}
```

---

## Flujo 5: Sync Inicial

### Primera vez que usuario abre app

```
App inicia
    │
    ├─ Verifica autenticación
    ├─ Obtiene businessId del usuario
    │
    ├─ Inicializa PGlite
    │   ├─ Crea tablas si no existen
    │   └─ dataDir: 'idb://avileo-biz-{businessId}'
    │
    ├─ Configura Electric shapes
    │   │
    │   ├─ syncShapeToTable({
    │   │   table: 'customers',
    │   │   params: { where: `business_id = '${businessId}'` }
    │   │ })
    │   │
    │   ├─ syncShapeToTable({
    │   │   table: 'sales',
    │   │   params: { where: `business_id = '${businessId}'` }
    │   │ })
    │   │
    │   ├─ syncShapeToTable({ table: 'products', ... })
    │   ├─ syncShapeToTable({ table: 'payments', ... })
    │   └─ ... más tablas
    │
    ├─ Electric conecta
    │   ├─ Establece WebSocket
    │   ├─ Pide snapshot inicial
    │   └─ Recibe datos históricos
    │
    ├─ Aplica a PGlite
    │   ├─ Inserta customers (500 filas)
    │   ├─ Inserta sales (1000 filas)
    │   ├─ Inserta sale_items (3000 filas)
    │   └─ ...
    │
    └─ UI lista
        ├─ Muestra "Sincronizando..." → "Listo"
        └─ Todos los datos disponibles offline

Performance esperada:
- 1000 ventas + items: ~2-3 segundos
- 5000 registros totales: ~5-8 segundos
- Uso de memoria: ~50-100MB
```

### Métricas de Sync Inicial

| Dataset | Registros | Tiempo | Memoria |
|---------|-----------|--------|---------|
| Pequeño | < 500 | < 1s | ~20MB |
| Mediano | 500-2000 | 2-4s | ~50MB |
| Grande | 2000-5000 | 5-10s | ~100MB |
| Muy grande | > 5000 | Considerar paginación | > 150MB |

---

## Decision Tree

```
¿Usuario está online?
    │
    ├─ SÍ
    │   ├─ Write: POST/PUT/DELETE a API
    │   └─ Read: PGlite local (actualizado por Electric)
    │
    └─ NO
        ├─ Write: Guardar en IndexedDB queue
        ├─ Read: PGlite local (datos de último sync)
        └─ Cuando vuelva online:
            └─ Procesar queue automáticamente

¿Hay conflicto de edición?
    │
    ├─ Diferentes campos
    │   └─ Merge automático (ambos cambios válidos)
    │
    └─ Mismo campo
        └─ Last-write-wins (por timestamp)
```

---

## Referencias

- [Arquitectura general](./02-arquitectura.md)
- [Log de decisiones técnicas](./04-decisiones.md)
- [Troubleshooting](./06-troubleshooting.md)

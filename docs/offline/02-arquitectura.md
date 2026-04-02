# Arquitectura Offline-First

> Visión general del stack PGlite + ElectricSQL + Drizzle ORM para Avileo

## Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Base de datos local** | PGlite (PostgreSQL WASM) | Almacenamiento estructurado en el browser |
| **Sync automático** | ElectricSQL | Sincronización servidor → cliente (reads) |
| **ORM** | Drizzle ORM | Queries tipados y schema compartido |
| **Queue offline** | IndexedDB + lógica propia | Persistencia de writes cuando no hay conexión |
| **API** | ElysiaJS (backend) | Validación y escrituras en PostgreSQL |

## Patrón Arquitectónico: Híbrido

### Reads (Lecturas)
- ElectricSQL sincroniza automáticamente desde PostgreSQL
- Usa "Shapes" (subconjuntos de tablas) filtradas por `business_id`
- Cliente siempre tiene datos actualizados en tiempo real
- PGlite actúa como cache estructurado

### Writes (Escrituras)
- Todas las escrituras pasan por la API REST
- Backend valida reglas de negocio
- Si hay conexión: POST/PUT/DELETE inmediato
- Si no hay conexión: se encola en IndexedDB
- Cuando vuelve la conexión: se procesa la cola

### Por qué este patrón

| Ventaja | Explicación |
|---------|-------------|
| **Validación garantizada** | Todas las escrituras pasan por backend |
| **Sync automático** | No necesitamos implementar polling manual |
| **Offline funcional** | IndexedDB queue permite trabajar sin red |
| **SQL nativo** | PGlite permite queries complejos, joins, transacciones |
| **Types compartidos** | Drizzle schema usado en frontend y backend |

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (Cliente)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React UI (Componentes, Hooks)                           │  │
│  │  ├─ useCustomers()                                       │  │
│  │  ├─ useSales()                                           │  │
│  │  └─ useCreateSale()                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  Drizzle ORM (Type-safe queries)                          │  │
│  │  ├─ db.select().from(customers)                          │  │
│  │  ├─ db.insert(sales).values(...)                         │  │
│  │  └─ db.update() / db.delete()                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  PGlite (PostgreSQL en WASM)                              │  │
│  │  └─ dataDir: 'idb://avileo-pg' (IndexedDB)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  ElectricSQL Sync (Read Path)                             │  │
│  │  ├─ syncShapeToTable('customers')                        │  │
│  │  ├─ syncShapeToTable('sales')                            │  │
│  │  └─ syncShapeToTable('payments')                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  Write Queue (Offline Support)                            │  │
│  │  ├─ Online: POST /api/sales                              │  │
│  │  └─ Offline: IndexedDB → Retry cuando online             │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   ElectricSQL        │
                    │   (Sync Service)     │
                    │   - Proxy local      │
                    │   - Cloud opcional   │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│  SERVIDOR (Backend)          │                                  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  REST API (ElysiaJS)                                      │  │
│  │  ├─ POST   /api/sales        ←─ Write Path               │  │
│  │  ├─ POST   /api/customers                                │  │
│  │  ├─ PUT    /api/sales/:id                                │  │
│  │  └─ DELETE /api/sales/:id                                │  │
│  │                                                           │  │
│  │  Validaciones:                                            │  │
│  │  ├─ Business rules                                        │  │
│  │  ├─ Auth & permissions                                    │  │
│  │  └─ Data integrity                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  Drizzle ORM (mismo schema que frontend)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  PostgreSQL (Fuente de verdad)                            │  │
│  │  ├─ Cambios → Electric captura vía logical replication   │  │
│  │  └─ Se propaga a todos los clientes conectados           │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### Lectura (Automático)

```
Usuario abre app
    ↓
Inicializa PGlite
    ↓
Configura Electric shapes
    ↓
Electric conecta a PostgreSQL
    ↓
Recibe snapshot inicial
    ↓
Datos disponibles en PGlite
    ↓
Drizzle queries funcionan
    ↓
UI renderiza con datos locales

[Cualquier cambio en PostgreSQL]
    ↓
Electric detecta vía replication
    ↓
Envía diff a cliente
    ↓
Aplica cambios en PGlite
    ↓
Live queries se actualizan
    ↓
UI re-render automáticamente
```

### Escritura (Con validación)

```
Usuario crea venta
    ↓
POST /api/sales { datos }
    ↓
Backend valida:
  ├─ Token válido?
  ├─ Permisos de negocio?
  ├─ Reglas de negocio?
  └─ Data integrity?
    ↓
Inserta en PostgreSQL
    ↓
Electric detecta INSERT
    ↓
Propaga a todos los clientes
    ↓
Incluye al creador (ya tiene los datos)
```

## Decisiones Clave

### 1. Schema Compartido

**Dónde:** `packages/shared/schema.ts` o archivo copiado en ambos proyectos

**Por qué:**
- Un solo source of truth para tipos
- Frontend y backend siempre sincronizados
- Cambios en schema se propagan automáticamente

```typescript
// packages/shared/schema.ts
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  businessId: text('business_id').notNull(),
  // ...
});

export type Customer = typeof customers.$inferSelect;
```

### 2. Filtro por Tenant

**Siempre** filtrar shapes por `business_id`:

```typescript
// CORRECTO
syncShapeToTable({
  shape: {
    table: 'customers',
    params: { where: `business_id = '${currentBusinessId}'` }
  }
})

// INCORRECTO (nunca hacer)
syncShapeToTable({
  shape: { table: 'customers' } // Sin filtro!
})
```

**Consecuencias de no filtrar:**
- Ver datos de otros negocios (brecha de seguridad)
- Consumo excesivo de memoria
- Sync lento

### 3. Cola de Writes

**Opciones evaluadas:**

| Opción | Pros | Contras |
|--------|------|---------|
| **Direct API** (sin queue) | Simple | No offline support |
| **IndexedDB Queue** | Full offline, persistente | Más complejo |
| **PGlite temp table** | Transaccional | No persiste entre sesiones |

**Decisión:** IndexedDB Queue
- Permite cerrar app y reabrir con datos pendientes
- Survive browser crashes
- Control total sobre retry logic

## Comparación con Arquitectura Anterior

| Aspecto | TanStack DB + Electric | PGlite + Electric |
|---------|------------------------|-------------------|
| Queries | In-memory filters | SQL nativo |
| Joins | Manual, lento | SQL joins eficientes |
| Transactions | Limitadas | Full ACID |
| Offline reads | ✅ Cache | ✅ PGlite |
| Offline writes | ✅ Queue | ✅ Queue (custom) |
| Bundle size | ~100KB | ~2.6MB (PGlite) |
| Performance reads | Media | Alta (índices SQL) |
| Developer experience | OK | Excelente (Drizzle) |

## Próximos Pasos

1. **Migración de schema:** Convertir Zod a Drizzle
2. **Setup PGlite:** Inicialización con Electric
3. **Configurar shapes:** Definir qué tablas sync
4. **Implementar queue:** IndexedDB para writes offline
5. **Testing:** Escenarios offline/online

## Referencias

- [Flujo detallado de sincronización](./03-flujo-sync.md)
- [Log de decisiones técnicas](./04-decisiones.md)
- [Guía de migración](./05-migracion.md)
- [Troubleshooting](./06-troubleshooting.md)

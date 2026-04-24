# Contexto: Migración Completa al Engine de Sync

## Objetivo
Migrar todas las entidades operativas del frontend de Avileo para que usen exclusivamente el engine de sync (`@avileo/drizzle-sync` + PGlite), eliminando llamadas directas a API REST para operaciones CRUD.

## Estado Actual del Proyecto

### Stack
- **Frontend**: React Router v7 + React 19 + Vite + TanStack Query
- **Sync Engine**: `@avileo/drizzle-sync` con PGlite (PostgreSQL en WASM)
- **API Client**: Eden Treaty (`@elysiajs/eden`) — usado solo para features online-only

### Entidades en SYNC_ENTITIES (16 total)
`customers`, `sales`, `sale_items`, `abonos`, `distribuciones`, `distribucion_items`, `products`, `product_variants`, `tags`, `customer_tags`, `purchases`, `purchase_items`, `customer_groups`, `customer_group_members`, `visitas`, `suppliers`

## Clasificación de Entidades (Verificado)

### 1. Completamente Migradas (12 entidades)
Todas usan `useSyncEngine` + servicio generado/extensión. Sin llamadas a API.

| Entidad | Service | Hook Principal |
|---------|---------|----------------|
| customers | `CustomerService` extends `CustomersService` | `use-customers.ts` |
| products | `ProductService` extends `ProductsService` | `use-products.ts` |
| product_variants | via `ProductService` | `use-product-variants.ts` |
| purchases | `PurchaseService` extends `PurchasesService` | `use-purchases.ts` |
| purchase_items | via `PurchaseService` | `use-purchases.ts` |
| suppliers | `SupplierService` extends `SuppliersService` | `use-suppliers.ts` |
| visitas | `VisitaService` extends `VisitasService` | `use-visitas.ts` |
| tags | `TagService` extends `TagsService` | `use-tags.ts` |
| customer_tags | `CustomerTagService` extends `CustomerTagsService` | `use-customer-tags.ts` |
| customer_groups | `CustomerGroupService` extends `CustomerGroupsService` | `use-grupos.ts` |
| customer_group_members | via `CustomerGroupService` | `use-grupos.ts` |
| abonos | `PaymentService` extends `AbonosService` | `use-payments.ts` |

### 2. Parcialmente Migradas (1 entidad) + Online-Only Intencional (1 entidad)

| Entidad | Qué está migrado | Qué NO está migrado | Razón |
|---------|------------------|---------------------|-------|
| **sales** | Queries + mutations (create, update, cancel) | `useDeleteSale` para non-draft usa API directa | Pendiente de migrar |
| **distribuciones** | Queries + items (add/update/remove) | create, close, update, delete usan API directa | **Online-only intencional**: side effects en backend (creación automática de visitas, validaciones de negocio complejas) |

### 3. Online-Only por Diseño (correctamente no migrables)
Configuración, integraciones externas, reportes agregados, features públicas.

| Categoría | Entidades |
|-----------|-----------|
| Configuración | business, business-settings, profile, team, invitations, puntos-venta, payment-methods-config |
| Integraciones | whatsapp-settings, whatsapp-messages, whatsapp-templates, send-whatsapp-message, OCR |
| Reportes | dashboard, stock-alerts, missing-inventory, sale-analysis |
| Features públicas | sale-token, public-sale |
| Archivos | files, assets |

## Patrón Objetivo (Target Pattern)

```typescript
// Hook
const engine = useSyncEngine();
const service = engine.use("entityName", () => new EntityService(engine));

// Service
class EntityService extends GeneratedEntityService {
  constructor(engine: SyncClientEngineLike) {
    super(engine);
  }
  // métodos custom solo si es necesario
}

// Componente
const { data } = useEntities(); // hook que usa el pattern arriba
```

## Anti-Patrón a Eliminar

```typescript
// ❌ Llamada directa a API para operaciones CRUD
const { data, error } = await api.entities({ id }).delete();
```

## Alcance de Este Plan

**In-Scope**:
- Migrar `useDeleteSale` a sync engine (FR-001)
- Agregar guardas offline a distribuciones (crear/cerrar son online-only intencional) (FR-002)
- Migrar `useBulkAssignGroups` a sync engine (FR-003)
- Limpieza de código legacy (FR-004)
- Evaluar SaleService con generated service (FR-005)

**Out-of-Scope**:
- Features online-only por diseño: configuración, WhatsApp, reportes, archivos, tokens públicos
- Distribuciones (crear/cerrar): online-only intencional por side effects en backend (visitas)

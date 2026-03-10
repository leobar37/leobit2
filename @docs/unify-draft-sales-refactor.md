# Unificación Completa: Ventas ↔ Pedidos

## Contexto

Sistema Avileo (PollosPro) - Offline-first chicken sales management. Actualmente tenemos **dos sistemas paralelos** que resuelven problemas similares:

- **Ventas (Sales)**: Transacciones instantáneas, cálculo con tara, modos de pago (pago_total/a_cuenta/debe_todo)
- **Pedidos (Orders)**: Pre-ventas con fecha de entrega, versionado, snapshots, tokens para clientes

Esta duplicación crea:
- 47+ archivos backend duplicados (schemas, APIs, services, repositories)
- 35+ archivos frontend duplicados (hooks, colecciones, componentes)
- Complejidad de mantenimiento
- Inconsistencias en UX (calculadora completa en ventas, placeholder en pedidos)

## Objetivo

**Unificar Ventas y Pedidos en una sola entidad: `transactions`**

La unificación mantendrá todas las features de ambos sistemas:
- Flujo de ventas instantáneas (de Sales)
- Flujo de pedidos con entrega futura (de Orders)
- Calculadora completa con tara (de Sales)
- Versionado y snapshots (de Orders)
- Tracking de reembolsos completo (de Sales)
- Tokens para edición de cliente (de Orders)

## Arquitectura Target

### Esquema de Base de Datos Unificado

```typescript
// transactions - Tabla unificada
export const transactions = pgTable("transactions", {
  // Identificación
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Relaciones
  businessId: uuid("business_id").notNull().references(() => businesses.id),
  clientId: uuid("client_id").references(() => customers.id),
  sellerId: uuid("seller_id").notNull().references(() => businessUsers.id),
  
  // Tipo determina el flujo
  type: transactionTypeEnum("type").notNull(), 
  // "instant_sale" | "pre_order"
  
  // Estados unificados
  status: transactionStatusEnum("status").notNull().default("draft"),
  // "draft" → "confirmed" → ("active" | "delivered") → "cancelled"
  
  // Fechas según tipo
  transactionDate: timestamp("transaction_date").notNull().defaultNow(),
  deliveryDate: date("delivery_date"), // Solo pre_order
  orderDate: date("order_date"),       // Solo pre_order
  
  // Pago - Unificación de campos
  paymentIntent: paymentIntentEnum("payment_intent").notNull(),
  // "contado" | "credito"
  
  paymentMode: paymentModeEnum("payment_mode"), 
  // "pago_total" | "a_cuenta" | "debe_todo" | null
  
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("sin_pago"),
  // "sin_pago" | "adelanto_parcial" | "pagado_total" | "saldo_pendiente"
  
  // Montos
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceDue: decimal("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),
  advanceAmount: decimal("advance_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  
  // Detalles de pago adelantado (de Orders)
  advancePaymentMethod: varchar("advance_payment_method", { length: 20 }),
  advanceReferenceNumber: varchar("advance_reference_number", { length: 50 }),
  advanceProofImageId: uuid("advance_proof_image_id").references(() => files.id),
  
  // Peso (de Sales)
  tara: decimal("tara", { precision: 10, scale: 3 }),
  netWeight: decimal("net_weight", { precision: 10, scale: 3 }),
  
  // Versionado y snapshots (de Orders)
  version: integer("version").notNull().default(1),
  confirmedSnapshot: jsonb("confirmed_snapshot"),
  deliveredSnapshot: jsonb("delivered_snapshot"),
  
  // Edición por cliente (de Orders)
  allowCustomerEdit: boolean("allow_customer_edit").notNull().default(true),
  
  // Reembolso (de Sales)
  refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }),
  refundDate: timestamp("refund_date"),
  refundMethod: refundMethodEnum("refund_method"),
  refundReference: varchar("refund_reference", { length: 100 }),
  refundNotes: text("refund_notes"),
  
  // Cancelación
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: uuid("cancelled_by").references(() => businessUsers.id),
  cancelReason: text("cancel_reason"),
  
  // Sync offline-first
  syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
  syncAttempts: integer("sync_attempts").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Estados y Flujos

```
instant_sale (Ventas):
  draft ──confirm()──→ active ──cancel()──→ cancelled
  
pre_order (Pedidos):
  draft ──confirm()──→ confirmed ──deliver()──→ delivered
                              └─cancel()──→ cancelled
```

## Patrones Offline-First

### Estrategia de Sincronización

**Current State:**
- **Sales**: Sincroniza venta completa con items en una sola llamada
- **Orders**: Sincroniza orden sin items, luego items separadamente

**Target State:**
- Items sincronizados independientemente (patrón Orders - mejor UX offline)
- Versionado obligatorio para pre_order, opcional para instant_sale
- Drafts sin cliente soportados (local-only hasta asignar cliente)

### Colecciones TanStack DB

```typescript
// transaction.collection.ts
export const transactionCollection = createCollection(
  electricCollectionOptions({
    id: "transactions",
    schema: transactionSchema,
    onInsert: async ({ transaction }) => {
      // Si no tiene cliente, queda local-only
      if (!newTransaction.clientId) {
        return { txid: Date.now() };
      }
      // Sincroniza con backend
      const response = await api.transactions.post(payload);
      return { txid: data.txid };
    },
    onUpdate: async ({ transaction }) => {
      // Maneja transiciones de estado
      if (changes.status === "active" || changes.status === "confirmed") {
        await api.transactions({ id }).confirm.post({ baseVersion });
      }
    }
  })
);

// transaction-item.collection.ts  
export const transactionItemCollection = createCollection(
  electricCollectionOptions({
    id: "transaction_items",
    schema: transactionItemSchema,
    // Items se sincronizan independientemente de la transacción
  })
);
```

## Impacto Completo

### Backend - 47+ archivos

#### Schemas (5 archivos)
| Archivo | Acción |
|---------|--------|
| `db/schema/enums.ts` | Agregar `transactionTypeEnum`, `transactionStatusEnum` |
| `db/schema/sales.ts` | **DEPRECAR** (mantener durante migración) |
| `db/schema/orders.ts` | **DEPRECAR** (mantener durante migración) |
| `db/schema/transactions.ts` | **CREAR** - Esquema unificado |
| `db/schema/transaction-items.ts` | **CREAR** - Items unificados |
| `db/schema/index.ts` | Actualizar exports |

#### Repositories (3 archivos)
| Archivo | Acción |
|---------|--------|
| `services/repository/sale.repository.ts` | **DEPRECAR** |
| `services/repository/order.repository.ts` | **DEPRECAR** |
| `services/repository/transaction.repository.ts` | **CREAR** - Unificado |

#### Services (4 archivos)
| Archivo | Acción |
|---------|--------|
| `services/business/sale.service.ts` | **DEPRECAR** |
| `services/business/order.service.ts` | **DEPRECAR** |
| `services/business/order-draft.service.ts` | **DEPRECAR** |
| `services/business/transaction.service.ts` | **CREAR** - Unificado |

#### API Routes (3 archivos)
| Archivo | Acción |
|---------|--------|
| `api/sales.ts` | **DEPRECAR** (mantener redirects) |
| `api/orders.ts` | **DEPRECAR** (mantener redirects) |
| `api/transactions.ts` | **CREAR** - Endpoints unificados |

#### Sync Service
| Archivo | Acción |
|---------|--------|
| `services/sync/sync.service.ts` | Modificar cases "sales" y "orders" → "transactions" |

### Frontend - 35+ archivos

#### Schemas & Collections (6 archivos)
| Archivo | Acción |
|---------|--------|
| `lib/db/schemas/sale.ts` | **DEPRECAR** |
| `lib/db/schemas/order.ts` | **DEPRECAR** |
| `lib/db/schemas/transaction.ts` | **CREAR** |
| `lib/db/collections/sale.collection.ts` | **DEPRECAR** |
| `lib/db/collections/order.collection.ts` | **DEPRECAR** |
| `lib/db/collections/transaction.collection.ts` | **CREAR** |

#### Hooks (3 archivos)
| Archivo | Acción |
|---------|--------|
| `hooks/use-sales-db.ts` | **DEPRECAR** (~345 líneas) |
| `hooks/use-orders.ts` | **DEPRECAR** (~355 líneas) |
| `hooks/use-transactions.ts` | **CREAR** - Unificado |

#### Componentes (15+ archivos)
| Archivo | Acción |
|---------|--------|
| `components/sales/new-sale.tsx` | **REFACTOR** (712 líneas → ~150) |
| `components/sales/*` | Mover a `components/commerce/` |
| `components/orders/order-form.tsx` | **REFACTOR** (438 líneas → ~150) |
| `components/orders/*` | Mover a `components/commerce/` |
| `components/commerce/` | **CREAR** - Componentes extraídos |

### Base de Datos Relacionada

| Tabla | Impacto |
|-------|---------|
| `abonos` | Actualizar FK `relatedSaleId` → `relatedTransactionId` |
| `closings` | Definir si incluye solo instant_sale o también pre_order confirmed |
| `order_events` | Renombrar a `transaction_events` |
| `order_tokens` | Renombrar a `transaction_tokens` |

## Migración de Datos

### Estrategia

**Fase 1: Migración SQL** (durante deploy)

```sql
-- 1. Crear nuevas tablas
CREATE TABLE transactions (...);
CREATE TABLE transaction_items (...);

-- 2. Migrar ventas existentes → type = 'instant_sale'
INSERT INTO transactions (...)
SELECT 
  id, business_id, client_id, seller_id,
  'instant_sale', status,
  sale_date, NULL, NULL,
  sale_type, payment_mode, payment_status,
  total_amount, amount_paid, balance_due, '0',
  tara, net_weight,
  1, NULL, NULL,
  refund_amount, refund_date, refund_method,
  cancelled_at, cancelled_by, cancel_reason,
  sync_status, sync_attempts,
  created_at, created_at
FROM sales;

-- 3. Migrar pedidos existentes → type = 'pre_order'
INSERT INTO transactions (...)
SELECT 
  id, business_id, client_id, seller_id,
  'pre_order', status,
  created_at, delivery_date, order_date,
  payment_intent, NULL, payment_status,
  total_amount, advance_amount, balance_due, advance_amount,
  NULL, NULL,
  version, confirmed_snapshot, delivered_snapshot,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  sync_status, sync_attempts,
  created_at, updated_at
FROM orders;

-- 4. Migrar items de ventas
INSERT INTO transaction_items (...)
SELECT id, sale_id, ..., quantity, NULL, NULL, 
  unit_price, NULL, NULL, subtotal, false, NULL
FROM sale_items;

-- 5. Migrar items de pedidos
INSERT INTO transaction_items (...)
SELECT id, order_id, ..., ordered_quantity, ordered_quantity, delivered_quantity,
  unit_price_quoted, unit_price_quoted, unit_price_final, 
  (ordered_quantity * unit_price_quoted), is_modified, original_quantity
FROM order_items;
```

**Fase 2: Sincronización Offline**
- Forzar sync de todos los dispositivos antes del deploy
- Nuevo código lee de ambas tablas durante transición
- Cleanup de tablas legacy después de 7 días

**Fase 3: Rollback Plan**
- Mantener tablas sales/orders durante 30 días
- Scripts de rollback listos para restaurar datos
- Feature flags para revertir a sistema anterior

## Timeline Estimado

| Fase | Duración | Archivos | Descripción |
|------|----------|----------|-------------|
| **1. Diseño Detallado** | 3-4 días | 0 | Decisiones arquitectónicas, revisión de equipo |
| **2. Backend Schemas** | 2-3 días | 5 | Enums, tablas, tipos |
| **3. Backend Repositories** | 4-5 días | 3 | Acceso a datos unificado |
| **4. Backend Services** | 5-7 días | 4 | Lógica de negocio unificada |
| **5. Backend API** | 3-4 días | 3 | Endpoints REST |
| **6. Frontend Collections** | 3-4 días | 4 | TanStack DB offline-first |
| **7. Frontend Hooks** | 2-3 días | 3 | Queries y mutations |
| **8. Frontend Components** | 7-10 días | 15+ | Extracción y refactorización |
| **9. Migración Datos** | 1-2 días | SQL | Scripts y testing |
| **10. Tests** | 4-5 días | 20+ | Unit, integration, E2E |
| **11. Deploy & Monitoreo** | 2-3 días | - | Rollback plan listo |

**Total: 36-50 días laborables (7-10 semanas)**

## Consideraciones de Riesgo

### Riesgos Técnicos

1. **Migración de datos con sync offline**
   - **Riesgo**: Usuarios con datos offline en dispositivos
   - **Mitigación**: Forzar sync antes de deploy, código dual durante transición

2. **Cambios breaking en API**
   - **Riesgo**: Apps móviles viejas dejan de funcionar
   - **Mitigación**: Mantener endpoints legacy con redirects durante 30 días

3. **Performance de queries unificados**
   - **Riesgo**: Queries más lentos por unificación
   - **Mitigación**: Índices específicos por tipo (instant_sale vs pre_order)

### Riesgos de Negocio

1. **Interrupción del servicio**
   - **Riesgo**: Downtime durante migración
   - **Mitigación**: Migración en etapas, deploy en horario bajo

2. **Pérdida de datos**
   - **Riesgo**: Error en migración SQL
   - **Mitigación**: Backups completos, scripts de rollback testeados

## Próximos Pasos

1. ✅ **Aprobación del plan** - Revisión con equipo de producto y tech leads
2. 📋 **Crear tickets detallados** - Jira/Linear con cada fase desglosada
3. 🔧 **Setup de feature branch** - `feat/unify-transactions`
4. 🧪 **Ambiente de staging** - Para testing de migración de datos
5. 👥 **Asignar owners** - Backend, Frontend, QA, DBA

---

**Document Version:** 2.0  
**Last Updated:** 2025-03-10  
**Status:** Planning - Awaiting Approval

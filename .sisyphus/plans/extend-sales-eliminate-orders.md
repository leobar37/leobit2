# Plan de Trabajo: Extender Sales para Eliminar Orders

**Documento:** Unificación Ventas-Pedidos en Sales  
**Proyecto:** Avileo  
**Fecha:** 2025-03-10  
**Duración:** 29 días (6 semanas)  
**Status:** Listo para Ejecución

---

## 🎯 Objetivo

Extender la tabla `sales` para soportar flujos de ventas instantáneas y pedidos programados, eliminando completamente la tabla `orders` y toda su infraestructura.

---

## 📐 Principios de Diseño

| Principio | Implementación |
|-----------|----------------|
| **Tabla única** | `sales` contendrá ambos flujos |
| **Distinguir por fecha** | `deliveryDate != null` = pedido |
| **State Machine** | Estados claros para cada flujo |
| **Eliminación completa** | Tabla `orders` se elimina post-migración |
| **Rutas separadas** | `/ventas` y `/pedidos` coexisten |
| **Offline-first** | TanStack DB + ElectricSQL |
| **Función compartir** | Migrar orderTokens → saleTokens |

---

## 🔄 State Machine

```
VENTA INSTANTÁNEA (deliveryDate IS NULL):
┌─────┐   confirm()   ┌────────┐   cancel()   ┌───────────┐
│draft│ ─────────────→│ active │ ───────────→│ cancelled │
└─────┘               └────────┘              └───────────┘
   ↓
cancel()
   ↓
cancelled

PEDIDO PROGRAMADO (deliveryDate IS NOT NULL):
┌─────┐   confirm()   ┌───────────┐  deliver()  ┌───────────┐
│draft│ ─────────────→│ confirmed │ ───────────→│ delivered │
└─────┘               └───────────┘             └───────────┘
   ↓                      ↓                          ↓
cancel()               cancel()                   cancel()
   ↓                      ↓                          ↓
cancelled              cancelled                  cancelled
```

---

## 📊 Esquemas de Base de Datos

### Enums Extendidos

```typescript
// db/schema/enums.ts

// Status extendido
export const saleStatusEnum = pgEnum("sale_status", [
  "draft",      // Borrador
  "confirmed",  // Pedido confirmado
  "active",     // Venta activa/completada
  "delivered",  // Pedido entregado
  "cancelled",  // Cancelado
]);

// Nuevo enum para estado de pago (de Orders)
export const salePaymentStatusEnum = pgEnum("sale_payment_status", [
  "sin_pago",
  "adelanto_parcial", 
  "pagado_total",
  "saldo_pendiente",
]);
```

### Tabla Sales Extendida

```typescript
// db/schema/sales.ts

export const sales = pgTable("sales", {
  // === IDENTIFICACIÓN (existente) ===
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id),
  clientId: uuid("client_id").references(() => customers.id),
  sellerId: uuid("seller_id").notNull().references(() => businessUsers.id),
  
  // === STATUS EXTENDIDO (nuevo) ===
  // Reemplaza status anterior simple
  status: saleStatusEnum("status").notNull().default("draft"),
  
  // === TIPO VIA FECHA (nuevo concepto) ===
  // null = venta instantánea, not null = pedido
  deliveryDate: date("delivery_date"),
  
  // === PAGO (existente + nuevo) ===
  saleType: saleTypeEnum("sale_type").notNull().default("contado"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceDue: decimal("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),
  
  // Nuevos campos de pago (de Orders)
  paymentStatus: salePaymentStatusEnum("payment_status").notNull().default("sin_pago"),
  advanceAmount: decimal("advance_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  advancePaymentMethod: varchar("advance_payment_method", { length: 20 }),
  advanceReferenceNumber: varchar("advance_reference_number", { length: 50 }),
  advanceProofImageId: uuid("advance_proof_image_id").references(() => files.id),
  
  // === PESO (existente) ===
  tara: decimal("tara", { precision: 10, scale: 3 }).default("0"),
  netWeight: decimal("net_weight", { precision: 10, scale: 3 }),
  
  // === VERSIONADO (nuevo - de Orders) ===
  version: integer("version").notNull().default(1),
  
  // === SNAPSHOTS (nuevo - de Orders) ===
  confirmedSnapshot: jsonb("confirmed_snapshot"),
  deliveredSnapshot: jsonb("delivered_snapshot"),
  
  // === EDICIÓN CLIENTE (nuevo - de Orders) ===
  allowCustomerEdit: boolean("allow_customer_edit").notNull().default(true),
  
  // === REEMBOLSO (existente) ===
  refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }),
  refundDate: timestamp("refund_date"),
  refundMethod: refundMethodEnum("refund_method"),
  refundReference: varchar("refund_reference", { length: 100 }),
  refundNotes: text("refund_notes"),
  
  // === CANCELACIÓN (existente) ===
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: uuid("cancelled_by").references(() => businessUsers.id),
  cancelReason: text("cancel_reason"),
  
  // === SYNC (existente) ===
  syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
  syncAttempts: integer("sync_attempts").notNull().default(0),
  
  // === FECHAS (existente) ===
  saleDate: timestamp("sale_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // Índices existentes
  index("idx_sales_business_id").on(table.businessId),
  index("idx_sales_client_id").on(table.clientId),
  index("idx_sales_seller_id").on(table.sellerId),
  index("idx_sales_sync_status").on(table.syncStatus),
  index("idx_sales_status").on(table.status),
  
  // Nuevos índices
  index("idx_sales_delivery_date").on(table.deliveryDate),
  index("idx_sales_business_delivery").on(table.businessId, table.deliveryDate),
  index("idx_sales_status_delivery").on(table.status, table.deliveryDate),
]);
```

### Tabla Sale Items Extendida

```typescript
// db/schema/sales.ts (continuación)

export const saleItems = pgTable("sale_items", {
  // === EXISTENTE ===
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  variantName: varchar("variant_name", { length: 50 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  
  // === NUEVO (de Orders) ===
  orderedQuantity: decimal("ordered_quantity", { precision: 10, scale: 3 }),
  deliveredQuantity: decimal("delivered_quantity", { precision: 10, scale: 3 }),
  unitPriceQuoted: decimal("unit_price_quoted", { precision: 10, scale: 2 }),
  unitPriceFinal: decimal("unit_price_final", { precision: 10, scale: 2 }),
  isModified: boolean("is_modified").notNull().default(false),
  originalQuantity: decimal("original_quantity", { precision: 10, scale: 3 }),
}, (table) => [
  index("idx_sale_items_sale_id").on(table.saleId),
  index("idx_sale_items_product_id").on(table.productId),
  index("idx_sale_items_variant_id").on(table.variantId),
]);
```

### Nueva Tabla: Sale Tokens

```typescript
// db/schema/sale-tokens.ts

export const saleTokens = pgTable("sale_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_sale_tokens_token").on(table.token),
  index("idx_sale_tokens_sale_id").on(table.saleId),
  index("idx_sale_tokens_expires").on(table.expiresAt),
]);

export type SaleToken = typeof saleTokens.$inferSelect;
export type NewSaleToken = typeof saleTokens.$inferInsert;
```

---

## 🔧 Backend - Services & API

### SaleService Extendido

```typescript
// services/business/sale.service.ts

export class SaleService {
  // === MÉTODOS EXISTENTES (mantener) ===
  async getSales(ctx, filters) { ... }
  async getSale(ctx, id) { ... }
  async createSale(ctx, data) { ... }
  async cancelSale(ctx, id, data) { ... }
  async getTodayStats(ctx) { ... }
  
  // === NUEVOS MÉTODOS (de Orders) ===
  
  /**
   * Confirmar venta/pedido
   * draft → active (venta instantánea)
   * draft → confirmed (pedido)
   */
  async confirmSale(
    ctx: RequestContext,
    id: string,
    baseVersion: number
  ): Promise<MutationResult<Sale>> {
    const sale = await this.repository.findById(ctx, id);
    
    if (sale.status !== "draft") {
      throw new ValidationError("Solo borradores pueden confirmarse");
    }
    
    // Determinar estado target basado en deliveryDate
    const targetStatus = sale.deliveryDate ? "confirmed" : "active";
    
    return db.transaction(async (tx) => {
      const confirmed = await this.repository.updateVersion(ctx, id, baseVersion, {
        status: targetStatus,
        confirmedSnapshot: this.buildSnapshot(sale),
      }, tx);
      
      // Crear evento
      await this.eventsRepository.create(ctx, {
        saleId: id,
        eventType: "confirmed",
        payload: { status: targetStatus },
      }, tx);
      
      return { data: confirmed, txid: await getTxid(tx) };
    });
  }
  
  /**
   * Entregar pedido
   * confirmed → delivered
   * Solo para pedidos (deliveryDate != null)
   */
  async deliverSale(
    ctx: RequestContext,
    id: string,
    baseVersion: number,
    deliveredItems: Array<{
      itemId: string;
      deliveredQuantity: number;
      unitPriceFinal?: number;
    }>,
    additionalPayment?: {
      amount: number;
      method: PaymentMethod;
      reference?: string;
    }
  ): Promise<MutationResult<Sale>> {
    const sale = await this.repository.findById(ctx, id);
    
    if (!sale.deliveryDate) {
      throw new ValidationError("Solo pedidos pueden entregarse");
    }
    
    if (sale.status !== "confirmed") {
      throw new ValidationError("Solo pedidos confirmados pueden entregarse");
    }
    
    // Validar fecha de entrega
    const today = new Date().toISOString().slice(0, 10);
    if (sale.deliveryDate !== today) {
      throw new ValidationError("Solo se puede entregar en la fecha programada");
    }
    
    return db.transaction(async (tx) => {
      // Actualizar items con cantidades entregadas
      for (const item of deliveredItems) {
        await this.repository.updateItem(ctx, id, item.itemId, {
          deliveredQuantity: item.deliveredQuantity.toString(),
          unitPriceFinal: item.unitPriceFinal?.toString(),
        }, tx);
      }
      
      // Calcular totales finales
      const finalTotal = this.calculateDeliveredTotal(sale.items, deliveredItems);
      
      // Actualizar sale
      const delivered = await this.repository.updateVersion(ctx, id, baseVersion, {
        status: "delivered",
        totalAmount: finalTotal.toFixed(2),
        deliveredSnapshot: this.buildSnapshot(sale),
      }, tx);
      
      // Procesar pago adicional si existe
      if (additionalPayment?.amount > 0) {
        await this.processAdditionalPayment(ctx, sale, additionalPayment, tx);
      }
      
      return { data: delivered, txid: await getTxid(tx) };
    });
  }
  
  // === MÉTODOS DE TOKEN ===
  
  async generateToken(ctx, saleId: string): Promise<string> {
    const sale = await this.repository.findById(ctx, saleId);
    if (!sale.allowCustomerEdit) {
      throw new ForbiddenError("Edición no permitida para esta venta");
    }
    
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas
    
    await this.tokenRepository.create(ctx, {
      saleId,
      token,
      expiresAt,
    });
    
    return token;
  }
  
  async validateToken(token: string): Promise<Sale | null> {
    const saleToken = await this.tokenRepository.findValidToken(token);
    if (!saleToken || saleToken.expiresAt < new Date()) {
      return null;
    }
    
    return this.repository.findById({ businessId: saleToken.sale.businessId } as RequestContext, saleToken.saleId);
  }
}
```

### API Routes Extendidas

```typescript
// api/sales.ts

export const saleRoutes = new Elysia({ prefix: "/sales" })
  .use(contextPlugin)
  .use(servicesPlugin)
  
  // === ENDPOINTS EXISTENTES ===
  .get("/", async ({ saleService, ctx, query }) => { ... })
  .get("/:id", async ({ saleService, ctx, params }) => { ... })
  .post("/", async ({ saleService, ctx, body }) => { ... })
  .post("/:id/cancel", async ({ saleService, ctx, params, body }) => { ... })
  
  // === NUEVOS ENDPOINTS ===
  
  // Confirmar venta/pedido
  .post("/:id/confirm", async ({ saleService, ctx, params, body }) => {
    const result = await saleService.confirmSale(
      ctx as RequestContext,
      params.id,
      body.baseVersion
    );
    return { success: true, data: result.data, txid: result.txid };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ baseVersion: t.Number({ minimum: 1 }) }),
  })
  
  // Entregar pedido
  .post("/:id/deliver", async ({ saleService, ctx, params, body }) => {
    const result = await saleService.deliverSale(
      ctx as RequestContext,
      params.id,
      body.baseVersion,
      body.deliveredItems,
      body.additionalPayment
    );
    return { success: true, data: result.data, txid: result.txid };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      baseVersion: t.Number({ minimum: 1 }),
      deliveredItems: t.Array(t.Object({
        itemId: t.String(),
        deliveredQuantity: t.Number({ minimum: 0 }),
        unitPriceFinal: t.Optional(t.Number({ minimum: 0 })),
      })),
      additionalPayment: t.Optional(t.Object({
        amount: t.Number({ minimum: 0 }),
        method: t.Union([t.Literal("efectivo"), t.Literal("yape"), t.Literal("plin"), t.Literal("transferencia")]),
        reference: t.Optional(t.String()),
      })),
    }),
  })
  
  // Generar token de edición
  .post("/:id/token", async ({ saleService, ctx, params }) => {
    const token = await saleService.generateToken(ctx as RequestContext, params.id);
    return { success: true, data: { token, url: `/s/${token}` } };
  })
  
  // Validar/obtener token
  .get("/:id/token", async ({ saleService, ctx, params }) => {
    const token = await saleService.getTokenBySaleId(ctx as RequestContext, params.id);
    return { success: true, data: token };
  })
  
  // Lista de drafts
  .get("/drafts/my", async ({ saleService, ctx }) => {
    const drafts = await saleService.getDrafts(ctx as RequestContext);
    return { success: true, data: drafts };
  });
```

---

## 🎨 Frontend - Collections & Hooks

### Sale Schema Extendido (Zod)

```typescript
// lib/db/schemas/sale.ts

export const saleStatusSchema = z.enum([
  "draft",
  "confirmed",
  "active",
  "delivered",
  "cancelled",
]);

export const salePaymentStatusSchema = z.enum([
  "sin_pago",
  "adelanto_parcial",
  "pagado_total",
  "saldo_pendiente",
]);

export const saleSchema = z.object({
  // Existentes
  id: z.string(),
  businessId: z.string(),
  clientId: z.string().nullable(),
  sellerId: z.string(),
  saleType: z.enum(["contado", "credito"]),
  totalAmount: z.string(),
  amountPaid: z.string(),
  balanceDue: z.string(),
  tara: z.string().nullable(),
  netWeight: z.string().nullable(),
  syncStatus: z.enum(["pending", "synced", "error"]),
  createdAt: z.coerce.date(),
  
  // Nuevos
  status: saleStatusSchema.default("draft"),
  deliveryDate: z.string().nullable(), // null = venta, string = pedido
  version: z.number().default(1),
  paymentStatus: salePaymentStatusSchema.default("sin_pago"),
  advanceAmount: z.string().default("0"),
  advancePaymentMethod: z.string().nullable(),
  advanceReferenceNumber: z.string().nullable(),
  allowCustomerEdit: z.boolean().default(true),
  
  // Joined
  items: z.array(saleItemSchema).optional(),
  client: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
  }).optional(),
});

export const saleItemSchema = z.object({
  // Existentes
  id: z.string(),
  saleId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  subtotal: z.string(),
  
  // Nuevos
  orderedQuantity: z.string().nullable(),
  deliveredQuantity: z.string().nullable(),
  unitPriceQuoted: z.string().nullable(),
  unitPriceFinal: z.string().nullable(),
  isModified: z.boolean().default(false),
  originalQuantity: z.string().nullable(),
});
```

### Sale Collection Extendida

```typescript
// lib/db/collections/sale.collection.ts

export const saleCollection = createCollection(
  electricCollectionOptions({
    id: "sales",
    schema: saleSchema,
    getKey: (sale) => sale.id,
    shapeOptions: createShapeOptions("sales"),
    
    onInsert: async ({ transaction }) => {
      const newSale = transaction.mutations[0].modified;
      
      // Draft sin cliente = local-only
      if (!newSale.clientId) {
        return { txid: Date.now() };
      }
      
      const response = await api.sales.post({
        clientId: newSale.clientId,
        saleType: newSale.saleType,
        totalAmount: parseFloat(newSale.totalAmount),
        amountPaid: parseFloat(newSale.amountPaid),
        deliveryDate: newSale.deliveryDate || undefined,
        tara: newSale.tara ? parseFloat(newSale.tara) : undefined,
        netWeight: newSale.netWeight ? parseFloat(newSale.netWeight) : undefined,
        items: [], // Items se sincronizan separadamente
      });
      
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      
      const data = response.data as { data: { id: string; txid?: number } };
      return { txid: data?.data?.txid };
    },
    
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];
      
      // Si era local-only y ahora tiene cliente, crear en servidor
      if (changes.clientId && !original.clientId) {
        const response = await api.sales.post({
          id: original.id,
          clientId: changes.clientId,
          saleType: original.saleType,
          totalAmount: parseFloat(original.totalAmount),
          deliveryDate: original.deliveryDate || undefined,
        });
        
        if (response.error) throw new Error(String(response.error.value));
        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }
      
      // Manejar transiciones de estado
      if (changes.status === "active" && original.status === "draft") {
        // Venta instantánea: draft → active
        const response = await api.sales({ id: original.id }).confirm.post({
          baseVersion: original.version,
        });
        
        if (response.error) throw new Error(String(response.error.value));
        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }
      
      if (changes.status === "confirmed" && original.status === "draft") {
        // Pedido: draft → confirmed
        const response = await api.sales({ id: original.id }).confirm.post({
          baseVersion: original.version,
        });
        
        if (response.error) throw new Error(String(response.error.value));
        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }
      
      if (changes.status === "delivered" && original.status === "confirmed") {
        // Pedido: confirmed → delivered
        const response = await api.sales({ id: original.id }).deliver.post({
          baseVersion: original.version,
          deliveredItems: changes.items?.map((item: any) => ({
            itemId: item.id,
            deliveredQuantity: parseFloat(item.deliveredQuantity || item.quantity),
            unitPriceFinal: item.unitPriceFinal ? parseFloat(item.unitPriceFinal) : undefined,
          })) || [],
        });
        
        if (response.error) throw new Error(String(response.error.value));
        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }
      
      if (changes.status === "cancelled") {
        const response = await api.sales({ id: original.id }).cancel.post({
          reason: changes.cancelReason || "Cancelación",
          refundAmount: changes.refundAmount ? parseFloat(changes.refundAmount) : undefined,
          refundMethod: changes.refundMethod as any,
        });
        
        if (response.error) throw new Error(String(response.error.value));
        const data = response.data as { txid?: number };
        return { txid: data?.txid || Date.now() };
      }
      
      // Update regular
      const response = await api.sales({ id: original.id }).put({
        clientId: changes.clientId,
        saleType: changes.saleType,
        totalAmount: changes.totalAmount ? parseFloat(changes.totalAmount) : undefined,
        deliveryDate: changes.deliveryDate,
      });
      
      if (response.error) throw new Error(String(response.error.value));
      return { txid: Date.now() };
    },
    
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0];
      await api.sales({ id: original.id }).delete();
    },
  })
);
```

### Hooks Extendidos

```typescript
// hooks/use-sales-db.ts

// === QUERIES ===

export function useSales(filters?: { 
  status?: SaleStatus;
  deliveryDate?: string;
  isOrder?: boolean; // true = deliveryDate != null
}) {
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) => {
          const conditions = [eq(sale.businessId, businessId)];
          
          if (filters?.status) {
            conditions.push(eq(sale.status, filters.status));
          }
          
          if (filters?.isOrder === true) {
            conditions.push(eq(sale.deliveryDate, null));
          } else if (filters?.isOrder === false) {
            conditions.push(eq(sale.deliveryDate, null));
          }
          
          return and(...conditions);
        })
        .orderBy(({ sale }) => sale.createdAt, "desc"),
    [businessId, filters]
  );
}

// Ventas del día (instantáneas)
export function useTodaySales() {
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .join({ customer: customerCollection }, ...)
        .where(({ sale }) =>
          and(
            eq(sale.businessId, businessId),
            eq(sale.status, "active"), // Ventas completadas
            isNull(sale.deliveryDate), // Sin fecha = venta instantánea
            gte(sale.saleDate, todayStart)
          )
        ),
    [businessId]
  );
}

// Pedidos (con fecha de entrega)
export function useOrders(deliveryDate?: string) {
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) =>
          and(
            eq(sale.businessId, businessId),
            isNotNull(sale.deliveryDate), // Con fecha = pedido
            deliveryDate ? eq(sale.deliveryDate, deliveryDate) : undefined
          )
        )
        .orderBy(({ sale }) => sale.deliveryDate, "asc"),
    [businessId, deliveryDate]
  );
}

// Drafts
export function useDraftSales() {
  return useLiveQuery(
    (q) =>
      q
        .from({ sale: saleCollection })
        .where(({ sale }) =>
          and(
            eq(sale.sellerId, sellerId),
            eq(sale.status, "draft")
          )
        )
        .orderBy(({ sale }) => sale.createdAt, "desc"),
    [sellerId]
  );
}

// === MUTATIONS ===

export function useConfirmSale() {
  return async (saleId: string) => {
    await saleCollection.update(saleId, (draft) => {
      draft.status = draft.deliveryDate ? "confirmed" : "active";
    });
  };
}

export function useDeliverSale() {
  return async (saleId: string, deliveredItems: DeliveredItem[]) => {
    // Actualizar items con cantidades entregadas
    for (const item of deliveredItems) {
      await saleItemCollection.update(item.id, (draft) => {
        draft.deliveredQuantity = item.deliveredQuantity.toString();
        draft.unitPriceFinal = item.unitPriceFinal?.toString();
      });
    }
    
    // Actualizar sale a delivered
    await saleCollection.update(saleId, (draft) => {
      draft.status = "delivered";
    });
  };
}

export function useCreateSaleToken() {
  return async (saleId: string) => {
    const response = await api.sales({ id: saleId }).token.post();
    return response.data?.data?.token;
  };
}
```

---

## 🎨 Frontend - Componentes

### Estructura de Componentes

```
components/
├── sales/
│   ├── new-sale.tsx              # Refactor para soportar status
│   ├── sale-card.tsx             # Mostrar tipo (venta/pedido)
│   ├── sale-list.tsx             # Lista con filtros
│   ├── share-button.tsx          # NUEVO - Compartir token
│   └── deliver-modal.tsx         # NUEVO - Entregar pedido
├── orders/                       # Reusar componentes de sales
│   └── order-list.tsx            # Wrapper de sale-list con filtro
└── commerce/                     # Componentes compartidos
    ├── customer-selector.tsx
    ├── payment-selector.tsx
    ├── product-calculator.tsx
    ├── cart-list.tsx
    └── transaction-summary.tsx
```

### ShareButton Component

```typescript
// components/sales/share-button.tsx

export function ShareButton({ saleId }: { saleId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const createToken = useCreateSaleToken();
  
  const handleShare = async () => {
    const newToken = await createToken(saleId);
    setToken(newToken);
    
    const shareUrl = `${window.location.origin}/s/${newToken}`;
    
    // Copiar al clipboard
    await navigator.clipboard.writeText(shareUrl);
    
    // O compartir nativo en móvil
    if (navigator.share) {
      await navigator.share({
        title: "Editar Pedido",
        text: "Haz clic para editar tu pedido:",
        url: shareUrl,
      });
    }
  };
  
  return (
    <Button onClick={handleShare} variant="outline">
      <Share2 className="h-4 w-4 mr-2" />
      Compartir
    </Button>
  );
}
```

---

## 🗄️ Migración de Datos

### Script SQL Completo

```sql
-- =====================================================
-- MIGRACIÓN: Orders → Sales
-- =====================================================

-- 1. Extender tabla sales
ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS status sale_status DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS confirmed_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS delivered_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS payment_status order_payment_status DEFAULT 'sin_pago',
  ADD COLUMN IF NOT EXISTS advance_amount decimal(12,2) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS advance_payment_method varchar(20),
  ADD COLUMN IF NOT EXISTS advance_reference_number varchar(50),
  ADD COLUMN IF NOT EXISTS advance_proof_image_id uuid REFERENCES files(id),
  ADD COLUMN IF NOT EXISTS allow_customer_edit boolean DEFAULT true;

-- Actualizar ventas existentes
UPDATE sales 
SET status = 'active' 
WHERE status IS NULL OR status = '';

-- 2. Extender tabla sale_items
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS ordered_quantity decimal(10,3),
  ADD COLUMN IF NOT EXISTS delivered_quantity decimal(10,3),
  ADD COLUMN IF NOT EXISTS unit_price_quoted decimal(10,2),
  ADD COLUMN IF NOT EXISTS unit_price_final decimal(10,2),
  ADD COLUMN IF NOT EXISTS is_modified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_quantity decimal(10,3);

-- 3. Crear tabla sale_tokens
CREATE TABLE IF NOT EXISTS sale_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  token varchar(64) NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_tokens_token ON sale_tokens(token);
CREATE INDEX idx_sale_tokens_sale_id ON sale_tokens(sale_id);

-- 4. Migrar orders → sales
INSERT INTO sales (
  id, business_id, client_id, seller_id,
  status, delivery_date, sale_date,
  sale_type, payment_status, total_amount, advance_amount, balance_due,
  advance_payment_method, advance_reference_number, advance_proof_image_id,
  version, confirmed_snapshot, delivered_snapshot, allow_customer_edit,
  sync_status, sync_attempts, created_at
)
SELECT 
  id, business_id, client_id, seller_id,
  CASE 
    WHEN status = 'draft' THEN 'draft'::sale_status
    WHEN status = 'confirmed' THEN 'confirmed'::sale_status
    WHEN status = 'delivered' THEN 'delivered'::sale_status
    WHEN status = 'cancelled' THEN 'cancelled'::sale_status
    ELSE 'confirmed'::sale_status
  END,
  delivery_date, 
  COALESCE(order_date::timestamp, created_at),
  payment_intent,
  payment_status,
  total_amount,
  advance_amount,
  balance_due,
  advance_payment_method,
  advance_reference_number,
  advance_proof_image_id,
  version,
  confirmed_snapshot,
  delivered_snapshot,
  allow_customer_edit,
  sync_status,
  sync_attempts,
  created_at
FROM orders
ON CONFLICT (id) DO NOTHING;

-- 5. Migrar order_items → sale_items
INSERT INTO sale_items (
  id, sale_id, product_id, variant_id,
  product_name, variant_name,
  quantity, ordered_quantity, delivered_quantity,
  unit_price, unit_price_quoted, unit_price_final,
  subtotal, is_modified, original_quantity
)
SELECT 
  id, order_id, product_id, variant_id,
  product_name, variant_name,
  ordered_quantity,
  ordered_quantity,
  delivered_quantity,
  unit_price_quoted,
  unit_price_quoted,
  unit_price_final,
  (ordered_quantity::decimal * unit_price_quoted::decimal),
  is_modified,
  original_quantity
FROM order_items
ON CONFLICT (id) DO NOTHING;

-- 6. Migrar order_tokens → sale_tokens
INSERT INTO sale_tokens (id, sale_id, token, expires_at, used_at, created_at)
SELECT id, order_id, token, expires_at, used_at, created_at
FROM order_tokens
ON CONFLICT (id) DO NOTHING;

-- 7. Actualizar FKs en abonos
ALTER TABLE abonos 
  ADD COLUMN IF NOT EXISTS related_sale_id_new uuid REFERENCES sales(id);

UPDATE abonos 
SET related_sale_id_new = related_order_id
WHERE related_order_id IS NOT NULL;

-- 8. Verificación
SELECT 
  'Ventas migradas' as check_name,
  COUNT(*) as count
FROM sales 
WHERE delivery_date IS NULL
UNION ALL
SELECT 
  'Pedidos migrados' as check_name,
  COUNT(*) as count
FROM sales 
WHERE delivery_date IS NOT NULL
UNION ALL
SELECT 
  'Items migrados' as check_name,
  COUNT(*) as count
FROM sale_items
WHERE sale_id IN (SELECT id FROM sales WHERE delivery_date IS NOT NULL);

-- 9. Crear índices nuevos
CREATE INDEX IF NOT EXISTS idx_sales_delivery_date ON sales(delivery_date);
CREATE INDEX IF NOT EXISTS idx_sales_status_delivery ON sales(status, delivery_date);

-- 10. Eliminar tablas orders (DESPUÉS DE VERIFICACIÓN)
-- DROP TABLE IF EXISTS order_tokens;
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS order_events;
-- DROP TABLE IF EXISTS orders;
```

---

## 📋 Work Breakdown - 6 Semanas

### Semana 1: Backend Foundation
**Días 1-2: Schema Changes**
- [ ] Modificar `enums.ts` - Extender saleStatusEnum, agregar salePaymentStatusEnum
- [ ] Modificar `sales.ts` - Agregar todos los campos nuevos
- [ ] Crear `sale-tokens.ts` - Nueva tabla
- [ ] Actualizar `index.ts` - Exportar nuevos tipos
- [ ] Generar migración Drizzle

**Días 3-5: Repository Updates**
- [ ] Extender `sale.repository.ts`:
  - Métodos de versionado (updateVersion)
  - Filtros por deliveryDate
  - Queries para pedidos

### Semana 2: Backend Services
**Días 1-2: Service Core**
- [ ] Extender `sale.service.ts` - confirmSale()
- [ ] Extender `sale.service.ts` - deliverSale()
- [ ] Crear `sale-token.service.ts` - generateToken(), validateToken()

**Días 3-5: API & Sync**
- [ ] Extender `api/sales.ts` - Nuevos endpoints
- [ ] Modificar `sync.service.ts` - Nuevos campos en sync
- [ ] Tests de API

### Semana 3: Frontend Foundation
**Días 1-2: Schemas & Collections**
- [ ] Extender `sale.ts` schema con Zod
- [ ] Extender `sale.collection.ts` - Lógica de estado
- [ ] Extender `sale-item.collection.ts` - Nuevos campos

**Días 3-5: Hooks**
- [ ] Extender `use-sales-db.ts` - Nuevos hooks
- [ ] useConfirmSale(), useDeliverSale(), useCreateToken()
- [ ] Tests de hooks

### Semana 4: Frontend Components
**Días 1-3: Component Extraction**
- [ ] Refactor `new-sale.tsx` - Soportar status machine
- [ ] Crear `share-button.tsx` - Compartir token
- [ ] Crear `deliver-modal.tsx` - Entregar pedido

**Días 4-5: Integration**
- [ ] Integrar en rutas de ventas
- [ ] Crear rutas de pedidos (reusando componentes)
- [ ] Testing manual

### Semana 5: Testing & Migration
**Días 1-2: Testing**
- [ ] Unit tests backend
- [ ] Integration tests frontend
- [ ] E2E tests críticos

**Días 3-5: Migration**
- [ ] Script de migración SQL
- [ ] Test en staging
- [ ] Rollback plan

### Semana 6: Deploy
**Días 1-2: Staging**
- [ ] Deploy a staging
- [ ] Validación completa
- [ ] Performance testing

**Días 3-4: Production**
- [ ] Backup
- [ ] Deploy a producción
- [ ] Monitoreo

**Día 5: Cleanup**
- [ ] Verificación post-deploy
- [ ] Drop tablas orders (si todo OK)
- [ ] Documentación final

---

## ✅ Success Criteria

### Funcionales
- [ ] Tabla `orders` eliminada completamente
- [ ] Todos los datos migrados sin pérdida
- [ ] Rutas `/ventas` y `/pedidos` funcionando
- [ ] Función "Compartir" operativa
- [ ] Flujo offline-first intacto

### Técnicos
- [ ] Build sin errores TypeScript
- [ ] Tests pasando >90%
- [ ] Migración ejecutada en < 5 minutos
- [ ] Rollback plan testeado

### UX
- [ ] Sin degradación de performance
- [ ] Transiciones de estado funcionan
- [ ] Sync offline funciona correctamente

---

## 🚨 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de datos en migración | Baja | Crítico | Backup completo, script testeado en staging |
| Sync offline falla | Media | Alto | Feature flag para rollback rápido |
| Performance degradada | Media | Medio | Índices nuevos, query optimization |
| Apps viejas dejan de funcionar | Alta | Medio | Endpoints legacy con redirects 30 días |

---

## 📝 Notas de Implementación

1. **Feature Flags**: Usar `USE_EXTENDED_SALES` para habilitar/deshabilitar cambios
2. **Backward Compatibility**: Mantener API responses compatibles durante transición
3. **Monitoring**: Logs específicos para tracking de migración
4. **Communication**: Notificar a usuarios sobre cambio invisible en UX

---

**Document Version:** 1.0  
**Created:** 2025-03-10  
**Status:** Ready for Implementation via `/start-work`

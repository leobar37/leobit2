# Plan de Implementación: Sistema de Distribución Flexible

## Fase 1: Schema de Base de Datos (Día 1)

### Paso 1.1: Modificar Tabla `distribuciones`
**Archivo:** `/packages/backend/src/db/schema/inventory.ts`

Agregar campos después de `estado`:

```typescript
// Nuevos campos para modo flexible
modo: text("modo").notNull().default("estricto"), // 'estricto' | 'acumulativo' | 'libre'
confiarEnVendedor: boolean("confiar_en_vendedor").notNull().default(false),
pesoConfirmado: boolean("peso_confirmado").notNull().default(true),
```

**Índices a agregar:**
```typescript
index("idx_distribuciones_modo").on(table.modo),
```

**Checkpoint:** Ejecutar `bun run db:generate` sin errores

---

### Paso 1.2: Crear Tabla `distribucion_items`
**Archivo:** `/packages/backend/src/db/schema/inventory.ts`

```typescript
export const distribucionItems = pgTable(
  "distribucion_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    
    // Relaciones
    distribucionId: uuid("distribucion_id")
      .notNull()
      .references(() => distribuciones.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    
    // Cantidades
    cantidadAsignada: decimal("cantidad_asignada", { precision: 10, scale: 3 }).notNull(),
    cantidadVendida: decimal("cantidad_vendida", { precision: 10, scale: 3 }).notNull().default("0"),
    
    // Unidad de medida (kg, unidad, docena)
    unidad: varchar("unidad", { length: 20 }).notNull().default("kg"),
    
    // Sync
    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    syncAttempts: integer("sync_attempts").notNull().default(0),
    
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_distribucion_items_distribucion_id").on(table.distribucionId),
    index("idx_distribucion_items_variant_id").on(table.variantId),
    index("idx_distribucion_items_sync_status").on(table.syncStatus),
    uniqueIndex("idx_distribucion_items_unique").on(table.distribucionId, table.variantId),
  ]
);

export type DistribucionItem = typeof distribucionItems.$inferSelect;
export type NewDistribucionItem = typeof distribucionItems.$inferInsert;
```

**Relaciones a agregar:**
```typescript
export const distribucionesRelations = relations(distribuciones, ({ one, many }) => ({
  // ... existing relations
  items: many(distribucionItems),
}));

export const distribucionItemsRelations = relations(distribucionItems, ({ one }) => ({
  distribucion: one(distribuciones, {
    fields: [distribucionItems.distribucionId],
    references: [distribuciones.id],
  }),
  variant: one(productVariants, {
    fields: [distribucionItems.variantId],
    references: [productVariants.id],
  }),
}));
```

---

### Paso 1.3: Actualizar Schema Index
**Archivo:** `/packages/backend/src/db/schema/index.ts`

Agregar exports:
```typescript
// En imports
import { 
  distribucionItems, 
  distribucionItemsRelations,
  type DistribucionItem,
  type NewDistribucionItem 
} from "./inventory";

// En exports
export {
  distribucionItems,
  distribucionItemsRelations,
  type DistribucionItem,
  type NewDistribucionItem,
};
```

**Checkpoint:** `bun run db:generate` debe crear migración sin errores

---

### Paso 1.4: Modificar Tabla `businesses`
**Archivo:** `/packages/backend/src/db/schema/businesses.ts`

Agregar después de `usarDistribucion`:
```typescript
modoDistribucion: text("modo_distribucion").notNull().default("estricto"),
```

---

### Paso 1.5: Aplicar Migración
**Comandos:**
```bash
cd packages/backend
bun run db:generate
bun run db:migrate
```

**Validación:** Verificar tablas creadas en PostgreSQL:
```sql
\dt distribucion_items
SELECT * FROM distribuciones LIMIT 1;
```

---

## Fase 2: Repository Layer (Día 1-2)

### Paso 2.1: Crear `distribucion-item.repository.ts`
**Archivo:** `/packages/backend/src/services/repository/distribucion-item.repository.ts`

```typescript
import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import { distribucionItems, type DistribucionItem, type NewDistribucionItem } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export class DistribucionItemRepository {
  async findByDistribucionId(
    ctx: RequestContext, 
    distribucionId: string
  ): Promise<DistribucionItem[]> {
    return db.query.distribucionItems.findMany({
      where: eq(distribucionItems.distribucionId, distribucionId),
      with: {
        variant: true,
      },
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewDistribucionItem, "id" | "createdAt">
  ): Promise<DistribucionItem> {
    const [item] = await db
      .insert(distribucionItems)
      .values(data)
      .returning();
    return item;
  }

  async updateVendido(
    ctx: RequestContext,
    id: string,
    cantidad: string
  ): Promise<DistribucionItem | undefined> {
    const [item] = await db
      .update(distribucionItems)
      .set({ cantidadVendida: cantidad })
      .where(eq(distribucionItems.id, id))
      .returning();
    return item;
  }

  async deleteByDistribucionId(
    ctx: RequestContext,
    distribucionId: string
  ): Promise<void> {
    await db
      .delete(distribucionItems)
      .where(eq(distribucionItems.distribucionId, distribucionId));
  }
}
```

---

### Paso 2.2: Actualizar `distribucion.repository.ts`
**Archivo:** `/packages/backend/src/services/repository/distribucion.repository.ts`

Agregar método:
```typescript
async findByIdWithItems(
  ctx: RequestContext,
  id: string
): Promise<(Distribucion & { items: DistribucionItem[] }) | undefined> {
  return db.query.distribuciones.findFirst({
    where: and(
      eq(distribuciones.id, id),
      eq(distribuciones.businessId, ctx.businessId)
    ),
    with: {
      items: {
        with: {
          variant: true,
        },
      },
    },
  });
}
```

---

## Fase 3: Service Layer - Distribución (Día 2)

### Paso 3.1: Modificar `DistribucionService.createDistribucion`
**Archivo:** `/packages/backend/src/services/business/distribucion.service.ts`

Modificar interfaz:
```typescript
interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  fecha: string;
  modo?: "estricto" | "acumulativo" | "libre";
  confiarEnVendedor?: boolean;
  items: Array<{
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }>;
}
```

Modificar lógica:
```typescript
async createDistribucion(
  ctx: RequestContext,
  data: CreateDistribucionInput
): Promise<Distribucion> {
  // Validar permisos...
  
  // Validar stock disponible en variant_inventory
  for (const item of data.items) {
    const inventory = await variantInventoryRepo.findByVariantId(ctx, item.variantId);
    const disponible = parseFloat(inventory?.quantity || "0");
    if (disponible < item.cantidadAsignada) {
      throw new ValidationError(
        `Stock insuficiente para variante ${item.variantId}. Disponible: ${disponible}, Requerido: ${item.cantidadAsignada}`
      );
    }
  }

  // Crear distribución
  const distribucion = await this.repository.create(ctx, {
    vendedorId: data.vendedorId,
    puntoVenta: data.puntoVenta,
    fecha: data.fecha,
    modo: data.modo || "estricto",
    confiarEnVendedor: data.confiarEnVendedor || false,
    pesoConfirmado: !data.confiarEnVendedor,
    kilosAsignados: "0", // Se calculará de items
    kilosVendidos: "0",
  });

  // Crear items y reservar stock
  for (const item of data.items) {
    await this.itemRepo.create(ctx, {
      distribucionId: distribucion.id,
      variantId: item.variantId,
      cantidadAsignada: item.cantidadAsignada.toString(),
      cantidadVendida: "0",
      unidad: item.unidad,
    });

    // Descontar de variant_inventory
    await this.variantInventoryRepo.decrement(
      ctx,
      item.variantId,
      item.cantidadAsignada.toString()
    );
  }

  return this.repository.findByIdWithItems(ctx, distribucion.id);
}
```

---

### Paso 3.2: Implementar Método de Cierre
```typescript
async closeDistribucion(ctx: RequestContext, id: string): Promise<Distribucion> {
  const distribucion = await this.repository.findByIdWithItems(ctx, id);
  
  // Devolver stock no vendido a variant_inventory
  for (const item of distribucion.items) {
    const asignada = parseFloat(item.cantidadAsignada);
    const vendida = parseFloat(item.cantidadVendida);
    const sobrante = asignada - vendida;
    
    if (sobrante > 0) {
      await this.variantInventoryRepo.increment(
        ctx,
        item.variantId,
        sobrante.toString()
      );
    }
  }

  return this.repository.updateEstado(ctx, id, "cerrado");
}
```

**Checkpoint:** Compilar sin errores (`bun run build`)

---

## Fase 4: Service Layer - Ventas (Día 2-3)

### Paso 4.1: Modificar `SaleService.createSale`
**Archivo:** `/packages/backend/src/services/business/sale.service.ts`

Agregar validación:
```typescript
async createSale(ctx: RequestContext, data: CreateSaleInput): Promise<Sale> {
  // ... validaciones existentes ...

  // Obtener distribución del día
  const today = new Date().toISOString().split('T')[0];
  const distribucion = await this.distribucionRepo.findByVendedorAndFecha(
    ctx, 
    ctx.businessUserId, 
    today
  );

  if (distribucion) {
    // Validar según modo
    if (distribucion.modo === "estricto") {
      await this.validarStockEstricto(ctx, distribucion, data.items);
    }
    // Si es 'acumulativo' o 'libre', no validar límites

    // Crear venta con distribucionId
    const sale = await this.repository.create(ctx, {
      ...data,
      distribucionId: distribucion.id,
    });

    // Actualizar cantidades vendidas en items
    await this.actualizarItemsVendidos(ctx, distribucion.id, data.items);

    return sale;
  } else {
    // Sin distribución - solo permitir si es admin o modo libre
    if (!ctx.isAdmin()) {
      const business = await this.businessRepo.findById(ctx, ctx.businessId);
      if (business?.modoDistribucion !== "libre") {
        throw new ValidationError("No tiene distribución asignada para hoy");
      }
    }

    return this.repository.create(ctx, data);
  }
}

private async validarStockEstricto(
  ctx: RequestContext,
  distribucion: Distribucion,
  items: SaleItemInput[]
): Promise<void> {
  const distribucionItems = await this.itemRepo.findByDistribucionId(
    ctx, 
    distribucion.id
  );

  for (const saleItem of items) {
    const distItem = distribucionItems.find(
      di => di.variantId === saleItem.variantId
    );

    if (!distItem) {
      throw new ValidationError(
        `Variante ${saleItem.variantId} no está en su distribución`
      );
    }

    const asignada = parseFloat(distItem.cantidadAsignada);
    const vendida = parseFloat(distItem.cantidadVendida);
    const disponible = asignada - vendida;
    const ventaActual = saleItem.quantity;

    if (ventaActual > disponible) {
      throw new ValidationError(
        `Stock insuficiente para ${saleItem.variantName}. ` +
        `Disponible: ${disponible}, Venta: ${ventaActual}`
      );
    }
  }
}
```

---

## Fase 5: Purchase Service (Día 3)

### Paso 5.1: Actualizar `PurchaseService.createPurchase`
**Archivo:** `/packages/backend/src/services/business/purchase.service.ts`

Agregar actualización de variant_inventory:
```typescript
async createPurchase(ctx: RequestContext, data: CreatePurchaseInput): Promise<Purchase> {
  // ... código existente ...

  const purchase = await this.repository.create(ctx, /* ... */);

  // Actualizar variant_inventory (además de inventory general)
  for (const item of data.items) {
    if (item.variantId) {
      const existing = await this.variantInventoryRepo.findByVariantId(
        ctx, 
        item.variantId
      );
      
      if (existing) {
        const currentQty = parseFloat(existing.quantity);
        const newQty = currentQty + item.quantity;
        await this.variantInventoryRepo.updateQuantity(
          ctx,
          item.variantId,
          newQty.toString()
        );
      } else {
        await this.variantInventoryRepo.create(ctx, {
          variantId: item.variantId,
          quantity: item.quantity.toString(),
        });
      }
    }
    
    // Mantener lógica existente de inventory general
    // ...
  }

  return purchase;
}
```

---

## Fase 6: API Layer (Día 3)

### Paso 6.1: Actualizar Endpoints de Distribuciones
**Archivo:** `/packages/backend/src/api/distribuciones.ts`

Agregar endpoints:
```typescript
// GET /distribuciones/:id/items
.get(
  "/:id/items",
  async ({ ctx, params, distribucionService }) => {
    const items = await distribucionService.getItems(ctx, params.id);
    return { success: true, data: items };
  }
)

// POST /distribuciones/:id/items (para agregar items a distribución existente)
.post(
  "/:id/items",
  async ({ ctx, params, body, distribucionService }) => {
    const item = await distribucionService.addItem(ctx, params.id, body);
    return { success: true, data: item };
  },
  {
    body: t.Object({
      variantId: t.String(),
      cantidadAsignada: t.Number({ minimum: 0.001 }),
      unidad: t.String(),
    }),
  }
)

// PUT /distribuciones/:id/items/:itemId
.put(
  "/:id/items/:itemId",
  async ({ ctx, params, body, distribucionService }) => {
    const item = await distribucionService.updateItem(
      ctx, 
      params.id, 
      params.itemId, 
      body
    );
    return { success: true, data: item };
  },
  {
    body: t.Object({
      cantidadAsignada: t.Optional(t.Number({ minimum: 0.001 })),
    }),
  }
)
```

---

## Fase 7: Frontend - Hooks (Día 4)

### Paso 7.1: Actualizar `use-distribuciones.ts`
**Archivo:** `/packages/app/app/hooks/use-distribuciones.ts`

Agregar:
```typescript
// Query para items
export function useDistribucionItems(distribucionId: string) {
  return useQuery({
    queryKey: ["distribuciones", distribucionId, "items"],
    queryFn: async () => {
      const { data, error } = await api
        .distribuciones({ id: distribucionId })
        .items.get();
      if (error) throw error;
      return data;
    },
    enabled: !!distribucionId,
  });
}

// Mutation para agregar item
export function useAddDistribucionItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      distribucionId,
      ...input
    }: {
      distribucionId: string;
      variantId: string;
      cantidadAsignada: number;
      unidad: string;
    }) => {
      const { data, error } = await api
        .distribuciones({ id: distribucionId })
        .items.post(input);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["distribuciones", variables.distribucionId, "items"],
      });
    },
  });
}
```

---

## Fase 8: Frontend - UI (Día 4-5)

### Paso 8.1: Crear Componente `DistribucionItemsForm`
**Archivo:** `/packages/app/app/components/distribucion/distribucion-items-form.tsx`

```typescript
interface DistribucionItemsFormProps {
  items: Array<{
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }>;
  onChange: (items: typeof items) => void;
}

export function DistribucionItemsForm({ items, onChange }: DistribucionItemsFormProps) {
  const { data: variants } = useProductVariants();
  
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-end">
          <VariantSelector
            value={item.variantId}
            onChange={(variantId) => {
              const newItems = [...items];
              newItems[index].variantId = variantId;
              onChange(newItems);
            }}
          />
          <Input
            type="number"
            value={item.cantidadAsignada}
            onChange={(e) => {
              const newItems = [...items];
              newItems[index].cantidadAsignada = parseFloat(e.target.value);
              onChange(newItems);
            }}
            placeholder="Cantidad"
          />
          <Select
            value={item.unidad}
            onValueChange={(unidad) => {
              const newItems = [...items];
              newItems[index].unidad = unidad;
              onChange(newItems);
            }}
          >
            <option value="kg">kg</option>
            <option value="unidad">Unidad</option>
            <option value="docena">Docena</option>
          </Select>
          <Button
            variant="destructive"
            onClick={() => {
              const newItems = items.filter((_, i) => i !== index);
              onChange(newItems);
            }}
          >
            Eliminar
          </Button>
        </div>
      ))}
      <Button
        onClick={() => {
          onChange([
            ...items,
            { variantId: "", cantidadAsignada: 0, unidad: "kg" },
          ]);
        }}
      >
        Agregar Producto
      </Button>
    </div>
  );
}
```

---

### Paso 8.2: Modificar Página de Distribuciones
**Archivo:** `/packages/app/app/routes/_protected.distribuciones.tsx`

Modificar formulario de creación:
```typescript
const [items, setItems] = useState([
  { variantId: "", cantidadAsignada: 0, unidad: "kg" },
]);

// En el submit
await createDistribucion.mutateAsync({
  vendedorId,
  puntoVenta,
  fecha,
  modo: selectedModo, // 'estricto' | 'acumulativo' | 'libre'
  confiarEnVendedor: trustMode,
  items,
});
```

---

## Fase 9: Frontend - Nueva Venta (Día 5)

### Paso 9.1: Validación de Stock
**Archivo:** `/packages/app/app/routes/_protected.ventas.nueva.tsx`

Agregar validación antes de submit:
```typescript
const { data: miDistribucion } = useMiDistribucion();

const handleSubmit = async () => {
  // Validar stock si hay distribución y modo estricto
  if (miDistribucion?.modo === "estricto") {
    for (const cartItem of cartItems) {
      const distItem = miDistribucion.items.find(
        (i) => i.variantId === cartItem.variantId
      );
      
      if (!distItem) {
        setSubmitError(
          `${cartItem.variantName} no está en su distribución`
        );
        return;
      }

      const disponible = 
        parseFloat(distItem.cantidadAsignada) - 
        parseFloat(distItem.cantidadVendida);
      
      if (cartItem.quantity > disponible) {
        setSubmitError(
          `Stock insuficiente para ${cartItem.variantName}. ` +
          `Disponible: ${disponible}, Carrito: ${cartItem.quantity}`
        );
        return;
      }
    }
  }

  // Proceder con venta...
};
```

---

## Fase 10: Sync/Offline (Día 5-6)

### Paso 10.1: Agregar a SyncService
**Archivo:** `/packages/backend/src/services/sync/sync.service.ts`

Agregar `distribucionItems` a:
- EntityType union
- applyOperation switch case
- Validaciones de payload

```typescript
type EntityType = 
  | "sales"
  | "customers"
  | "payments"
  | "distribuciones"
  | "distribucionItems" // Nuevo
  | "productVariants"
  | "closings";

// En applyOperation
case "distribucionItems":
  await this.applyDistribucionItemOperation(ctx, operation);
  break;
```

---

## Checkpoints y Validación

### Checkpoint 1: Schema (Fin Día 1)
- [ ] Migración ejecutada sin errores
- [ ] Tablas `distribucion_items` creada
- [ ] Columnas nuevas en `distribuciones`
- [ ] Relaciones configuradas

### Checkpoint 2: Backend Services (Fin Día 3)
- [ ] Repositorios funcionan
- [ ] Crear distribución con items
- [ ] Validación de stock estricto
- [ ] Cierre devuelve stock

### Checkpoint 3: API (Fin Día 3)
- [ ] Endpoints responden
- [ ] Autenticación funciona
- [ ] Validaciones de entrada

### Checkpoint 4: Frontend (Fin Día 5)
- [ ] Formulario items funciona
- [ ] Validación stock en venta
- [ ] UI responsive

### Checkpoint 5: Integración (Fin Día 6)
- [ ] Flujo completo: Compra → Distribución → Venta → Cierre
- [ ] Sync offline funciona
- [ ] Tests pasan

---

## Rollback Plan

Si algo falla gravemente:

1. **Reversión de migración:**
```bash
bun run db:rollback
```

2. **Eliminar cambios de código:**
```bash
git checkout -- packages/backend/src/db/schema/inventory.ts
git checkout -- packages/backend/src/services/
```

3. **Restaurar datos:**
- Backup de distribuciones existe en migración previa

---

## Notas Importantes

1. **Transacciones:** Todas las operaciones de stock deben ser atómicas
2. **Race conditions:** Usar row-level locking si hay concurrencia alta
3. **Testing:** Crear tests para cada modo (estricto/acumulativo/libre)
4. **Documentación:** Actualizar docs/ con nuevo flujo

---

Documento generado: Plan ejecutable paso a paso

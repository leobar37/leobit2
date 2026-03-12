# TanStack DB + ElectricSQL - Backend Adaptation Checklist

## Estado Actual

| Componente | Estado | Progreso |
|------------|--------|----------|
| Generación de txid | ✅ Listo | 100% |
| ElectricSQL Proxy | ✅ Listo | 100% |
| Endpoints con txid | ⚠️ Parcial | 25% |
| Tablas REPLICA IDENTITY | ⚠️ Parcial | 50% |

---

## ✅ Phase 1: Infraestructura Base (COMPLETADO)

- [x] Función `getTxid()` en `packages/backend/src/lib/txid.ts`
- [x] Proxy ElectricSQL en `packages/backend/src/api/electric.ts`
- [x] Tipos `MutationResult` definidos

---

## ✅ Phase 2: Endpoints con txid (PRIORIDAD ALTA)

### Sales - COMPLETO
- [x] POST `/sales`
- [x] PATCH `/sales/:id`
- [x] POST `/sales/:id/confirm`
- [x] POST `/sales/:id/deliver`
- [x] POST `/sales/:id/items`
- [x] PATCH `/sales/:id/items/:itemId`
- [x] DELETE `/sales/:id/items/:itemId`

### Payments - COMPLETO
- [x] POST `/payments`
- [x] PUT `/payments/:id/reference`
- [x] PUT `/payments/:id/proof`

### Customers - COMPLETO
- [x] POST `/customers`
- [x] PUT `/customers/:id`

---

## ✅ Phase 3: Products API (COMPLETADO)

### Products
- [x] POST `/products` → Agregar txid
- [x] PUT `/products/:id` → Agregar txid
- [x] DELETE `/products/:id` → (No requiere txid)

### Variants
- [x] POST `/products/:id/variants` → Agregar txid
- [x] PUT `/variants/:id` → Agregar txid
- [x] DELETE `/variants/:id` → (No requiere txid)

### Inventory
- [x] PUT `/variants/:id/inventory` → Agregar txid

### Product Service
- [x] Actualizar `ProductService.create()` para retornar `MutationResult`
- [x] Actualizar `ProductService.update()` para retornar `MutationResult`
- [x] Actualizar `ProductVariantService.create()` para retornar `MutationResult`
- [x] Actualizar `ProductVariantService.update()` para retornar `MutationResult`
- [x] Actualizar `VariantInventoryService.update()` para retornar `MutationResult`

---

## ✅ Phase 4: Suppliers API (COMPLETADO)

### Endpoints
- [x] POST `/suppliers` → Agregar txid
- [x] PUT `/suppliers/:id` → Agregar txid
- [x] DELETE `/suppliers/:id` → (No requiere txid)

### Supplier Service
- [x] Actualizar `SupplierService.create()` para retornar `MutationResult`
- [x] Actualizar `SupplierService.update()` para retornar `MutationResult`

---

## ✅ Phase 5: Purchases API (COMPLETADO)

### Endpoints
- [x] POST `/purchases` → Agregar txid
- [x] PUT `/purchases/:id/status` → Agregar txid
- [x] DELETE `/purchases/:id` → (No requiere txid)

### Purchase Service
- [x] Actualizar `PurchaseService.create()` para retornar `MutationResult`
- [x] Actualizar `PurchaseService.updateStatus()` para retornar `MutationResult`

---

## ✅ Phase 6: Tags API (COMPLETADO)

### Endpoints
- [x] POST `/tags` → Agregar txid
- [x] PUT `/tags/:id` → Agregar txid
- [x] DELETE `/tags/:id` → (No requiere txid)

### Customer Tags
- [ ] POST `/customers/:id/tags` → Agregar txid
- [ ] POST `/customers/bulk/tags` → Agregar txid

### Tag Service
- [x] Actualizar `TagService.create()` para retornar `MutationResult`
- [x] Actualizar `TagService.update()` para retornar `MutationResult`
- [ ] Actualizar `CustomerTagService.assignTags()` para retornar `MutationResult`
- [ ] Actualizar `CustomerTagService.bulkAssignTags()` para retornar `MutationResult`

---

## ✅ Phase 7: Inventory API (COMPLETADO)

### Endpoints
- [x] PUT `/inventory/:productId` → Agregar txid

### Inventory Service
- [x] Actualizar `InventoryService.adjust()` para retornar `MutationResult`
- [ ] Actualizar `InventoryService.bulkAdjust()` para retornar `MutationResult`

---

## ✅ Phase 8: Closings API (COMPLETADO)

### Endpoints
- [x] POST `/closings` → Agregar txid
- [x] PUT `/closings/:id` → Agregar txid
- [x] DELETE `/closings/:id` → (No requiere txid)

### Closing Service
- [x] Actualizar `ClosingService.create()` para retornar `MutationResult`
- [x] Actualizar `ClosingService.update()` para retornar `MutationResult`

---

## 🔲 Phase 9: Distributions API (PRIORIDAD BAJA)

### Endpoints
- [ ] POST `/distribuciones` → Agregar txid
- [ ] PUT `/distribuciones/:id` → Agregar txid
- [ ] PATCH `/distribuciones/:id/close` → Agregar txid
- [ ] DELETE `/distribuciones/:id` → (No requiere txid)

### Distribution Service
- [ ] Actualizar `DistributionService.create()` para retornar `MutationResult`
- [ ] Actualizar `DistributionService.update()` para retornar `MutationResult`
- [ ] Actualizar `DistributionService.close()` para retornar `MutationResult`

---

## 🔲 Phase 10: Product Units API (PRIORIDAD BAJA)

### Endpoints
- [ ] POST `/product-units` → Agregar txid
- [ ] PUT `/product-units/:id` → Agregar txid
- [ ] DELETE `/product-units/:id` → (No requiere txid)

### Product Unit Service
- [ ] Actualizar `ProductUnitService.create()` para retornar `MutationResult`
- [ ] Actualizar `ProductUnitService.update()` para retornar `MutationResult`

---

## 🔲 Phase 11: REPLICA IDENTITY (DATABASE)

### Migration: `0020_add_replica_identity.sql` - EXISTE ✅

### Tablas CON REPLICA IDENTITY FULL
- [x] sales
- [x] sale_items
- [x] customers
- [x] products
- [x] product_variants
- [x] orders
- [x] order_items
- [x] abonos (payments)

### Tablas SIN REPLICA IDENTITY FULL (AGREGAR)
- [ ] suppliers
- [ ] purchases
- [ ] tags
- [ ] product_units
- [ ] variant_inventory
- [ ] inventory
- [ ] closings
- [ ] distribuciones
- [ ] distribucion_items
- [ ] sale_tokens

### SQL a ejecutar:
```sql
-- Agregar a nueva migración
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE purchases REPLICA IDENTITY FULL;
ALTER TABLE tags REPLICA IDENTITY FULL;
ALTER TABLE product_units REPLICA IDENTITY FULL;
ALTER TABLE variant_inventory REPLICA IDENTITY FULL;
ALTER TABLE inventory REPLICA IDENTITY FULL;
ALTER TABLE closings REPLICA IDENTITY FULL;
ALTER TABLE distribuciones REPLICA IDENTITY FULL;
ALTER TABLE distribucion_items REPLICA IDENTITY FULL;
ALTER TABLE sale_tokens REPLICA IDENTITY FULL;
```

---

## 📋 Patrón para agregar txid

### 1. En el Service (ej: ProductService)

```typescript
// Antes
async create(ctx: RequestContext, data: CreateProductDTO): Promise<Product> {
  const product = await this.repo.create(ctx, data);
  return product;
}

// Después
async create(ctx: RequestContext, data: CreateProductDTO): Promise<MutationResult<Product>> {
  return await db.transaction(async (tx) => {
    const txid = await getTxid(tx);
    const [product] = await tx.insert(productsTable).values(data).returning();
    return { data: product, txid };
  });
}
```

### 2. En el API Endpoint

```typescript
// Antes
return { success: true, data: product };

// Después
return { success: true, data: result.data, txid: result.txid };
```

---

## 🎯 Orden de Implementación Recomendada

1. **Primero**: Products API (usado frecuentemente)
2. **Segundo**: Suppliers API + Purchases API
3. **Tercero**: Tags + Inventory
4. **Cuarto**: Closings + Distributions
5. **Último**: Product Units

---

## Estado de Progreso

```
Completado:  ✅ Phase 1, Phase 2
Pendiente:   Phase 3-11, REPLICA IDENTITY
```

**Total items checklist:** ~80 items
**Completados:** ~20 items (25%)
**Pendientes:** ~60 items (75%)

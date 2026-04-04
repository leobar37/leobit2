# T-006: Backend - Endpoint de Seed Demo

## Objective
Crear endpoint para sembrar datos de ejemplo (productos típicos de pollería) en un negocio nuevo.

## Requirements
- FR-006

## Files to Modify
- `packages/backend/src/api/businesses.ts` - Agregar endpoint
- `packages/backend/src/services/business/business.service.ts` - Agregar método seed

## Implementation Details

### 1. API Endpoint
```typescript
// En packages/backend/src/api/businesses.ts
.post(
  "/seed-demo",
  async ({ businessService, ctx }) => {
    const result = await businessService.seedDemoData(ctx);
    return { success: true, data: result };
  },
  {
    detail: {
      summary: "Seed demo data",
      description: "Creates sample products for new businesses",
    },
  }
)
```

### 2. Service Method
```typescript
// En packages/backend/src/services/business/business.service.ts
async seedDemoData(ctx: RequestContext) {
  // Productos típicos de pollería
  const demoProducts = [
    {
      name: "Pollo Entero",
      type: "pollo",
      unit: "kg",
      basePrice: "12.50",
    },
    {
      name: "1/2 Pollo",
      type: "pollo", 
      unit: "kg",
      basePrice: "6.50",
    },
    {
      name: "1/4 Pollo",
      type: "pollo",
      unit: "kg", 
      basePrice: "3.50",
    },
    {
      name: "Pierna",
      type: "pollo",
      unit: "unidad",
      basePrice: "8.00",
    },
    {
      name: "Pecho",
      type: "pollo",
      unit: "unidad",
      basePrice: "7.50",
    }
  ];

  const createdProducts = [];

  for (const productData of demoProducts) {
    // Verificar si ya existe producto con mismo nombre
    const existing = await this.businessRepo.findProductByName(
      ctx,
      productData.name
    );
    
    if (!existing) {
      const product = await this.businessRepo.createProduct(ctx, productData);
      createdProducts.push(product);
    }
  }

  return {
    productsCreated: createdProducts.length,
    products: createdProducts,
  };
}
```

### 3. Repository Method (if needed)
```typescript
// En packages/backend/src/services/repository/business.repository.ts
async findProductByName(ctx: RequestContext, name: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(
      eq(products.businessId, ctx.businessId),
      eq(products.name, name)
    ))
    .limit(1);
  
  return product;
}
```

## Validation Checklist
- [ ] Endpoint `POST /businesses/seed-demo` responde correctamente
- [ ] Crea 5 productos de ejemplo
- [ ] No duplica productos si ya existen
- [ ] Precios son realistas para pollería peruana
- [ ] Retorna conteo de productos creados
- [ ] Requiere autenticación (admin)
- [ ] Transacción atómica (todo o nada)

## Notes
- Los precios son sugerencias (S/ 12.50, 6.50, etc.)
- Considerar agregar cliente "Cliente de ejemplo" también
- Este endpoint es idempotente (safe to call multiple times)

## Testing
```bash
curl -X POST http://localhost:3000/api/businesses/seed-demo \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

# T-003: Backend - API Endpoints for Distribucion Items

**Status:** pending  
**Priority:** P0  
**Est. Time:** 2 hours  
**Requirements:** FR-006  
**Depends on:** T-002  
**Blocks:** T-004

## Description
Add API endpoints for managing distribucion items in the existing distribuciones router.

## File to Modify
**packages/backend/src/api/distribuciones.ts**

## Endpoints to Add

### 1. Get Items by Distribucion
```typescript
GET /:id/items

Response: {
  items: {
    id: string;
    variantId: string;
    cantidadAsignada: string;
    cantidadVendida: string;
    unidad: string;
    variantName: string;
    productName: string;
  }[]
}
```

### 2. Add Item
```typescript
POST /:id/items

Body: {
  variantId: string;
  cantidadAsignada: number;
  unidad: string;
}

Response: { item: DistribucionItem }
```

### 3. Update Item
```typescript
PATCH /:id/items/:itemId

Body: {
  cantidadAsignada?: number;
  cantidadVendida?: number;
}

Response: { item: DistribucionItem }
```

### 4. Delete Item
```typescript
DELETE /:id/items/:itemId

Response: { success: true }
```

### 5. Update Distribucion (Modify to Include Items)
Modify existing POST and PATCH to accept optional items array.

```typescript
POST /
Body: {
  vendedorId: string;
  puntoVenta: string;
  // ... existing fields
  items?: {
    variantId: string;
    cantidadAsignada: number;
    unidad: string;
  }[];
}
```

## Validation Rules

### For Create/Update Distribucion with Items
- If items provided, validate each has variantId and cantidadAsignada > 0
- Validate variant exists and belongs to business

### For Item Operations
- Distribucion must exist
- Distribucion status must allow modifications (activo, en_ruta)
- User must have inventory.write permission

## Error Responses

```typescript
// 404 - Distribucion not found
{ error: "Distribución no encontrada" }

// 400 - Invalid status
{ error: "No se pueden modificar items de una distribución cerrada" }

// 403 - No permission
{ error: "No tiene permisos para modificar distribuciones" }

// 404 - Item not found
{ error: "Item no encontrado" }

// 404 - Variant not found
{ error: "Variante no encontrada" }
```

## Verification Checklist

- [ ] GET /:id/items returns items with enriched names
- [ ] POST /:id/items creates item and syncs
- [ ] PATCH /:id/items/:itemId updates quantities
- [ ] DELETE /:id/items/:itemId removes item
- [ ] POST / with items creates distribucion + items atomically
- [ ] All validations working
- [ ] Error responses consistent

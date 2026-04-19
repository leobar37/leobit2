# T-006: Crear preset `avileo.ts`

## Requirement IDs
- FR-018, FR-019

## Objective
Crear un preset que exporte la configuración actual de Avileo para retrocompatibilidad.

## Files to Create

1. `packages/drizzle-sync/src/presets/avileo.ts`
2. `packages/drizzle-sync/src/presets/index.ts`

## Implementation

### `packages/drizzle-sync/src/presets/avileo.ts`

```typescript
/**
 * Avileo Preset
 * 
 * Pre-configured sync engine setup for Avileo application.
 * Provides backwards compatibility with existing code.
 * 
 * @example
 * ```typescript
 * import { createSyncEngine } from '@avileo/drizzle-sync';
 * import { avileoConfig } from '@avileo/drizzle-sync/presets';
 * 
 * const sync = createSyncEngine(avileoConfig);
 * ```
 */

import { defineEntity } from '../config';
import type { SyncEngineConfig } from '../config/types';

// Define all Avileo entities using the new API
export const avileoEntities = {
  customers: defineEntity('customers', {
    tableName: 'customers',
    fields: [
      'id', 'business_id', 'name', 'dni', 'phone', 'address', 'notes',
      'sync_status', 'sync_attempts', 'created_by', 'created_at', 'updated_at'
    ],
    priority: 1,
    parentFields: ['business_id'],
    selfHeal: true,
    syncStatusField: 'sync_status',
    conflictResolver: 'last-write-wins',
  }),

  sales: defineEntity('sales', {
    tableName: 'sales',
    fields: [
      'id', 'business_id', 'customer_id', 'seller_id', 'distribucion_id', 'visita_id',
      'type', 'sale_type', 'payment_mode', 'total_amount', 'amount_paid', 'balance_due',
      'tara', 'net_weight', 'sale_date', 'delivery_date', 'order_date', 'status',
      'version', 'confirmed_snapshot', 'delivered_snapshot', 'allow_customer_edit',
      'sync_status', 'sync_attempts', 'cancelled_at', 'cancelled_by', 'cancel_reason',
      'refund_amount', 'refund_date', 'refund_method', 'refund_reference', 'refund_notes',
      'advance_payment_method', 'advance_reference_number', 'advance_proof_image_id',
      'created_at', 'updated_at'
    ],
    priority: 1,
    parentFields: ['business_id', 'customer_id'],
    childEntities: ['sale_items', 'abonos'],
    selfHeal: true,
    syncStatusField: 'sync_status',
    versionField: 'version',
    conflictResolver: 'version-based',
  }),

  sale_items: defineEntity('sale_items', {
    tableName: 'sale_items',
    fields: [
      'id', 'business_id', 'sale_id', 'product_id', 'variant_id', 'product_name',
      'variant_name', 'quantity', 'ordered_quantity', 'delivered_quantity', 'unit_price',
      'unit_price_quoted', 'unit_price_final', 'cost_price_snapshot', 'subtotal', 
      'is_modified', 'original_quantity', 'sync_status', 'sync_attempts', 
      'sync_group_id', 'created_at', 'updated_at'
    ],
    priority: 2,
    parentFields: ['sale_id', 'business_id'],
    selfHeal: false,
    syncStatusField: 'sync_status',
  }),

  abonos: defineEntity('abonos', {
    tableName: 'abonos',
    fields: [
      'id', 'business_id', 'customer_id', 'seller_id', 'related_sale_id', 
      'amount', 'payment_method', 'reference_number', 'notes', 'proof_image_id', 
      'sync_status', 'sync_attempts', 'created_at', 'updated_at'
    ],
    priority: 2,
    parentFields: ['business_id', 'customer_id', 'related_sale_id'],
    selfHeal: true,
    syncStatusField: 'sync_status',
  }),

  products: defineEntity('products', {
    tableName: 'products',
    fields: [
      'id', 'business_id', 'name', 'type', 'unit', 'base_price', 'cost_price', 
      'is_active', 'has_variants', 'image_id', 'sync_status', 'sync_attempts', 
      'created_at', 'updated_at'
    ],
    priority: 1,
    parentFields: ['business_id'],
    childEntities: ['product_variants'],
    selfHeal: false,
    syncStatusField: 'sync_status',
  }),

  product_variants: defineEntity('product_variants', {
    tableName: 'product_variants',
    fields: [
      'id', 'business_id', 'product_id', 'name', 'sku', 'unit_quantity', 
      'price', 'cost_price', 'sort_order', 'is_active', 'sync_status', 
      'sync_attempts', 'created_at', 'updated_at'
    ],
    priority: 2,
    parentFields: ['product_id', 'business_id'],
    selfHeal: false,
    syncStatusField: 'sync_status',
  }),

  purchases: defineEntity('purchases', {
    tableName: 'purchases',
    fields: [
      'id', 'business_id', 'supplier_id', 'purchase_date', 'status', 'total_amount',
      'invoice_number', 'receipt_image_id', 'notes', 'sync_status', 'sync_attempts', 
      'sync_group_id', 'created_at', 'updated_at'
    ],
    priority: 1,
    parentFields: ['business_id', 'supplier_id'],
    childEntities: ['purchase_items'],
    selfHeal: true,
    syncStatusField: 'sync_status',
  }),

  purchase_items: defineEntity('purchase_items', {
    tableName: 'purchase_items',
    fields: [
      'id', 'business_id', 'purchase_id', 'product_id', 'variant_id', 'unit_id', 
      'quantity', 'unit_cost', 'total_cost', 'sync_status', 'sync_attempts', 
      'sync_group_id', 'created_at', 'updated_at'
    ],
    priority: 2,
    parentFields: ['purchase_id', 'business_id'],
    selfHeal: true,
    syncStatusField: 'sync_status',
  }),

  suppliers: defineEntity('suppliers', {
    tableName: 'suppliers',
    fields: [
      'id', 'business_id', 'name', 'type', 'ruc', 'phone', 'email', 'address', 
      'notes', 'is_active', 'sync_status', 'sync_attempts', 'created_at', 'updated_at'
    ],
    priority: 1,
    parentFields: ['business_id'],
    selfHeal: false,
    syncStatusField: 'sync_status',
  }),

  distribuciones: defineEntity('distribuciones', {
    tableName: 'distribuciones',
    fields: [
      'id', 'business_id', 'vendedor_id', 'punto_venta', 'punto_venta_id', 
      'fecha', 'estado', 'modo', 'monto_recaudado', 'nota_creacion', 'nota_cierre',
      'sync_status', 'sync_attempts', 'created_at', 'updated_at'
    ],
    priority: 1,
    parentFields: ['business_id'],
    childEntities: ['distribucion_items', 'visitas'],
    selfHeal: false,
    syncStatusField: 'sync_status',
  }),

  distribucion_items: defineEntity('distribucion_items', {
    tableName: 'distribucion_items',
    fields: [
      'id', 'business_id', 'distribucion_id', 'variant_id', 'cantidad_asignada', 
      'cantidad_vendida', 'unidad', 'sync_status', 'sync_attempts', 
      'created_at', 'updated_at'
    ],
    priority: 2,
    parentFields: ['distribucion_id', 'business_id'],
    selfHeal: false,
    syncStatusField: 'sync_status',
  }),

  visitas: defineEntity('visitas', {
    tableName: 'visitas',
    fields: [
      'id', 'business_id', 'distribucion_id', 'customer_id', 'vendedor_id', 
      'status', 'motivo_no_compra', 'sale_id', 'sync_status', 'sync_attempts', 
      'created_at', 'updated_at'
    ],
    priority: 2,
    parentFields: ['distribucion_id', 'customer_id', 'business_id'],
    selfHeal: true,
    syncStatusField: 'sync_status',
  }),

  tags: defineEntity('tags', {
    tableName: 'tags',
    fields: [
      'id', 'business_id', 'name', 'color', 'sync_status', 'sync_attempts',
      'created_at', 'updated_at'
    ],
    priority: 1,
    parentFields: ['business_id'],
    childEntities: ['customer_tags'],
    selfHeal: false,
    syncStatusField: 'sync_status',
  }),

  customer_tags: defineEntity('customer_tags', {
    tableName: 'customer_tags',
    fields: [
      'customer_id', 'tag_id', 'assigned_at', 'assigned_by', 
      'sync_status', 'sync_attempts'
    ],
    priority: 2,
    parentFields: ['customer_id', 'tag_id'],
    selfHeal: false,
    syncStatusField: 'sync_status',
  }),

  customer_groups: defineEntity('customer_groups', {
    tableName: 'customer_groups',
    fields: [
      'id', 'business_id', 'name', 'color', 'sync_status', 'sync_attempts',
      'created_at', 'updated_at'
    ],
    priority: 1,
    parentFields: ['business_id'],
    childEntities: ['customer_group_members'],
    selfHeal: true,
    syncStatusField: 'sync_status',
  }),

  customer_group_members: defineEntity('customer_group_members', {
    tableName: 'customer_group_members',
    fields: [
      'id', 'business_id', 'group_id', 'customer_id', 'sync_status', 
      'sync_attempts', 'added_at', 'added_by'
    ],
    priority: 2,
    parentFields: ['group_id', 'customer_id', 'business_id'],
    selfHeal: true,
    syncStatusField: 'sync_status',
  }),
};

// Type helper for Avileo entities
export type AvileoEntity = keyof typeof avileoEntities;

// Full configuration object
export const avileoConfig: SyncEngineConfig<AvileoEntity> = {
  entities: avileoEntities,
  options: {
    batchSize: 100,
    maxRetries: 5,
    syncInterval: 5000,
    pullInterval: 10000,
    backoffMultiplier: 2,
    logLevel: 'info',
  },
};

// Default export for convenience
export default avileoConfig;
```

### `packages/drizzle-sync/src/presets/index.ts`

```typescript
/**
 * Presets Module
 * 
 * Pre-configured sync engine setups for common use cases.
 */

export { avileoConfig, avileoEntities, type AvileoEntity } from './avileo';
export { default } from './avileo';
```

## Acceptance Criteria

- [ ] Preset define las 16 entidades de Avileo
- [ ] Prioridades configuradas correctamente
- [ ] Self-heal configurado según entidad
- [ ] Conflict resolvers configurados
- [ ] Exports funcionan correctamente

## Time Estimate

2 horas

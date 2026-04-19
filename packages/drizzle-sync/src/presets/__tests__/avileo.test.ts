import { describe, it, expect } from 'vitest';
import { avileoConfig, avileoEntities, type AvileoEntity } from '../avileo';
import { validateConfig } from '../../config';

describe('avileo preset', () => {
  it('defines all 16 entities', () => {
    const entityCount = Object.keys(avileoEntities).length;
    expect(entityCount).toBe(16);
  });

  it('has expected entity types', () => {
    const entities = Object.keys(avileoEntities);
    expect(entities).toContain('customers');
    expect(entities).toContain('sales');
    expect(entities).toContain('sale_items');
    expect(entities).toContain('abonos');
    expect(entities).toContain('products');
    expect(entities).toContain('product_variants');
    expect(entities).toContain('purchases');
    expect(entities).toContain('purchase_items');
    expect(entities).toContain('suppliers');
    expect(entities).toContain('distribuciones');
    expect(entities).toContain('distribucion_items');
    expect(entities).toContain('visitas');
    expect(entities).toContain('tags');
    expect(entities).toContain('customer_tags');
    expect(entities).toContain('customer_groups');
    expect(entities).toContain('customer_group_members');
  });

  it('passes config validation', () => {
    const result = validateConfig(avileoConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('customers entity has correct config', () => {
    const customers = avileoEntities.customers;
    expect(customers.tableName).toBe('customers');
    expect(customers.priority).toBe(1);
    expect(customers.selfHeal).toBe(true);
    expect(customers.syncStatusField).toBe('sync_status');
    expect(customers.conflictResolver).toBe('last-write-wins');
  });

  it('sales entity has child entities', () => {
    const sales = avileoEntities.sales;
    expect(sales.childEntities).toContain('sale_items');
    expect(sales.childEntities).toContain('abonos');
    expect(sales.versionField).toBe('version');
    expect(sales.conflictResolver).toBe('version-based');
  });

  it('child entities have higher priority than parents', () => {
    const parents = ['customers', 'products', 'sales', 'tags', 'customer_groups', 'distribuciones', 'purchases'];
    const children = ['sale_items', 'abonos', 'product_variants', 'customer_tags', 'customer_group_members', 'distribucion_items', 'visitas', 'purchase_items'];

    for (const parent of parents) {
      const parentPriority = avileoEntities[parent as AvileoEntity]?.priority;
      expect(parentPriority).toBeLessThanOrEqual(1);
    }

    for (const child of children) {
      const childPriority = avileoEntities[child as AvileoEntity]?.priority;
      expect(childPriority).toBeGreaterThan(1);
    }
  });

  it('avileoConfig has default options', () => {
    expect(avileoConfig.options?.batchSize).toBe(100);
    expect(avileoConfig.options?.maxRetries).toBe(5);
    expect(avileoConfig.options?.syncInterval).toBe(5000);
  });
});

import { describe, it, expect } from 'vitest';
import { avileoConfig, avileoEntities, type AvileoEntity } from '../avileo';
import { validateSyncConfig } from '../../config';

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
    const result = validateSyncConfig(avileoConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('customers entity has correct config', () => {
    const customers = avileoEntities.customers;
    expect(customers.syncable).toBe(true);
    expect(customers.priority).toBe(1);
    expect(customers.conflictResolver).toBe('last-write-wins');
    expect(customers.autoFields).toBe(true);
    expect(customers.relations?.children).toBeDefined();
    expect(customers.relations?.children!.length).toBeGreaterThan(0);
  });

  it('sales entity has child entities and version-based conflict resolution', () => {
    const sales = avileoEntities.sales;
    expect(sales.syncable).toBe(true);
    expect(sales.priority).toBe(2);
    expect(sales.conflictResolver).toBe('version-based');
    expect(sales.relations?.children).toBeDefined();
    expect(sales.relations?.children!.some(c => c.entity === 'sale_items')).toBe(true);
  });

  it('parent entities have priority 1', () => {
    const parents = ['customers', 'products', 'suppliers', 'tags', 'customer_groups', 'purchases', 'distribuciones'];
    
    for (const parent of parents) {
      const entity = avileoEntities[parent as AvileoEntity];
      expect(entity).toBeDefined();
      expect(entity!.priority).toBe(1);
    }
  });

  it('child entities have priority 2', () => {
    const children = [
      'sales', 'sale_items', 'abonos', 'product_variants',
      'purchase_items', 'distribucion_items', 'visitas',
      'customer_tags', 'customer_group_members'
    ];
    
    for (const child of children) {
      const entity = avileoEntities[child as AvileoEntity];
      expect(entity).toBeDefined();
      expect(entity!.priority).toBe(2);
    }
  });

  it('all entities are syncable', () => {
    for (const entity of Object.values(avileoEntities)) {
      expect(entity.syncable).toBe(true);
    }
  });

  it('all entities use autoFields', () => {
    for (const entity of Object.values(avileoEntities)) {
      expect(entity.autoFields).toBe(true);
    }
  });

  it('entities with parents have parent relations configured', () => {
    // sale_items has parents: sales, products, product_variants
    const saleItems = avileoEntities.sale_items;
    expect(saleItems.relations?.parents).toBeDefined();
    expect(saleItems.relations!.parents!.length).toBe(3);
    
    // abonos has parents: customers, sales
    const abonos = avileoEntities.abonos;
    expect(abonos.relations?.parents).toBeDefined();
    expect(abonos.relations!.parents!.length).toBe(2);
  });

  it('entities with children have child relations configured', () => {
    // customers has children: sales, abonos, visitas, customer_tags, customer_group_members
    const customers = avileoEntities.customers;
    expect(customers.relations?.children).toBeDefined();
    expect(customers.relations!.children!.length).toBe(5);
    
    // products has children: product_variants
    const products = avileoEntities.products;
    expect(products.relations?.children).toBeDefined();
    expect(products.relations!.children!.length).toBe(1);
  });

  it('avileoConfig has default options', () => {
    expect(avileoConfig.options?.batchSize).toBe(100);
    expect(avileoConfig.options?.maxRetries).toBe(5);
    expect(avileoConfig.options?.syncInterval).toBe(5000);
  });

  it('each entity references a Drizzle table', () => {
    for (const entity of Object.values(avileoEntities)) {
      expect(entity.table).toBeDefined();
      expect(typeof entity.table).toBe('object');
    }
  });

  it('no duplicate entity definitions', () => {
    const entityNames = Object.keys(avileoEntities);
    const uniqueNames = new Set(entityNames);
    expect(uniqueNames.size).toBe(entityNames.length);
  });
});

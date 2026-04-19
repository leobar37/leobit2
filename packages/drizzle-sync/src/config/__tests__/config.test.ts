import { describe, it, expect } from 'vitest';
import { defineEntity, entityBuilder, validateConfig, assertValidConfig } from '../';
import type { SyncEngineConfig } from '../types';

describe('config module', () => {
  describe('defineEntity', () => {
    it('creates entity config with defaults', () => {
      const entity = defineEntity('customers', {
        tableName: 'customers',
        fields: ['id', 'name'],
      });

      expect(entity.entityType).toBe('customers');
      expect(entity.tableName).toBe('customers');
      expect(entity.fields).toEqual(['id', 'name']);
      expect(entity.priority).toBe(99);
      expect(entity.selfHeal).toBe(false);
      expect(entity.conflictResolver).toBe('last-write-wins');
    });

    it('accepts custom values', () => {
      const entity = defineEntity('sales', {
        tableName: 'sales',
        fields: ['id', 'total'],
        priority: 1,
        selfHeal: true,
        conflictResolver: 'version-based',
        parentFields: ['customer_id'],
      });

      expect(entity.priority).toBe(1);
      expect(entity.selfHeal).toBe(true);
      expect(entity.conflictResolver).toBe('version-based');
      expect(entity.parentFields).toEqual(['customer_id']);
    });
  });

  describe('entityBuilder', () => {
    it('builds entity with fluent API', () => {
      const entity = entityBuilder('products')
        .table('products')
        .fields(['id', 'name', 'price'])
        .priority(1)
        .selfHeal(true)
        .build();

      expect(entity.entityType).toBe('products');
      expect(entity.fields).toEqual(['id', 'name', 'price']);
      expect(entity.priority).toBe(1);
    });

    it('throws if table not set', () => {
      expect(() => {
        entityBuilder('test')
          .fields(['id'])
          .build();
      }).toThrow('tableName is required');
    });

    it('throws if fields not set', () => {
      expect(() => {
        entityBuilder('test')
          .table('test')
          .build();
      }).toThrow('fields are required');
    });
  });

  describe('validateConfig', () => {
    it('validates valid config', () => {
      const config: SyncEngineConfig = {
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing entities', () => {
      const config = { entities: {} } as SyncEngineConfig;
      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_ENTITIES');
    });

    it('detects circular dependencies', () => {
      const config: SyncEngineConfig = {
        entities: {
          a: defineEntity('a', {
            tableName: 'a',
            fields: ['id'],
            priority: 1,
            childEntities: ['b'],
          }),
          b: defineEntity('b', {
            tableName: 'b',
            fields: ['id'],
            priority: 2,
            childEntities: ['a'],
          }),
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('detects priority hierarchy violations', () => {
      const config: SyncEngineConfig = {
        entities: {
          parent: defineEntity('parent', {
            tableName: 'parent',
            fields: ['id'],
            priority: 2,
            childEntities: ['child'],
          }),
          child: defineEntity('child', {
            tableName: 'child',
            fields: ['id'],
            priority: 1,
          }),
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_PRIORITY_HIERARCHY')).toBe(true);
    });

    it('detects missing child entities', () => {
      const config: SyncEngineConfig = {
        entities: {
          parent: defineEntity('parent', {
            tableName: 'parent',
            fields: ['id'],
            priority: 1,
            childEntities: ['nonexistent'],
          }),
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_CHILD_ENTITY')).toBe(true);
    });

    it('detects invalid sync status field', () => {
      const config: SyncEngineConfig = {
        entities: {
          test: defineEntity('test', {
            tableName: 'test',
            fields: ['id'],
            syncStatusField: 'nonexistent_field',
          }),
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_SYNC_STATUS_FIELD')).toBe(true);
    });
  });

  describe('assertValidConfig', () => {
    it('throws on invalid config', () => {
      expect(() => {
        assertValidConfig({ entities: {} } as SyncEngineConfig);
      }).toThrow('Invalid sync configuration');
    });

    it('does not throw on valid config', () => {
      const config: SyncEngineConfig = {
        entities: {
          test: defineEntity('test', {
            tableName: 'test',
            fields: ['id'],
          }),
        },
      };

      expect(() => assertValidConfig(config)).not.toThrow();
    });
  });
});

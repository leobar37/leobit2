import { describe, it, expect, vi } from 'vitest';
import { createSyncEngine } from '../create-sync-engine';
import { defineEntity } from '../config';
import type { GenericSyncOperationInput } from '../server/types';

describe('createSyncEngine', () => {
  const mockContext = { tenantId: 'biz-1', userId: 'user-1' };

  describe('basic creation', () => {
    it('creates sync engine with valid config', () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name', 'email'],
            priority: 1,
          }),
        },
      });

      expect(sync).toBeDefined();
      expect(sync.getEntities()).toEqual(['customers']);
    });

    it('throws on invalid config', () => {
      expect(() => {
        createSyncEngine({
          entities: {},
        } as any);
      }).toThrow('Invalid sync configuration');
    });

    it('exposes entity configuration', () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
            selfHeal: true,
          }),
        },
      });

      const config = sync.getEntityConfig('customers');
      expect(config?.tableName).toBe('customers');
      expect(config?.selfHeal).toBe(true);
    });

    it('hasEntity checks correctly', () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id'],
          }),
        },
      });

      expect(sync.hasEntity('customers')).toBe(true);
      expect(sync.hasEntity('nonexistent' as any)).toBe(false);
    });
  });

  describe('processBatch', () => {
    it('processes operations in priority order', async () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
          sales: defineEntity('sales', {
            tableName: 'sales',
            fields: ['id', 'customer_id', 'total'],
            priority: 2,
            parentFields: ['customer_id'],
          }),
        },
      });

      const operations: GenericSyncOperationInput<'customers' | 'sales'>[] = [
        {
          idempotencyKey: 'op-2',
          entityType: 'sales',
          entityId: 'sale-1',
          operation: 'create',
          payload: { id: 'sale-1', customer_id: 'cust-1', total: 100 },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
        {
          idempotencyKey: 'op-1',
          entityType: 'customers',
          entityId: 'cust-1',
          operation: 'create',
          payload: { id: 'cust-1', name: 'John' },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
      ];

      const result = await sync.processBatch(mockContext, operations);

      expect(result.summary.total).toBe(2);
      expect(result.results[0].idempotencyKey).toBe('op-1');
      expect(result.results[1].idempotencyKey).toBe('op-2');
    });

    it('emits events on push complete', async () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
        },
      });

      const eventSpy = vi.fn();
      sync.getEventEmitter().on('push:complete', eventSpy);

      const operations: GenericSyncOperationInput<'customers'>[] = [
        {
          idempotencyKey: 'op-1',
          entityType: 'customers',
          entityId: 'cust-1',
          operation: 'create',
          payload: { id: 'cust-1', name: 'John' },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
      ];

      await sync.processBatch(mockContext, operations);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operationsProcessed: 1,
          succeeded: 1,
          failed: 0,
          conflicts: 0,
        })
      );
    });

    it('calls onPushComplete hook', async () => {
      const hookSpy = vi.fn();
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
        },
        hooks: {
          onPushComplete: hookSpy,
        },
      });

      const operations: GenericSyncOperationInput<'customers'>[] = [
        {
          idempotencyKey: 'op-1',
          entityType: 'customers',
          entityId: 'cust-1',
          operation: 'create',
          payload: { id: 'cust-1', name: 'John' },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
      ];

      await sync.processBatch(mockContext, operations);
      expect(hookSpy).toHaveBeenCalled();
    });
  });

  describe('with custom handlers', () => {
    it('uses custom handlers when provided', async () => {
      const executeSpy = vi.fn().mockResolvedValue({
        success: true,
        idempotencyKey: 'op-1',
        serverTimestamp: new Date().toISOString(),
      });

      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id', 'name'],
            priority: 1,
          }),
        },
        handlers: {
          customers: () => ({
            entityType: 'customers',
            execute: executeSpy,
          }),
        },
      });

      const operations: GenericSyncOperationInput<'customers'>[] = [
        {
          idempotencyKey: 'op-1',
          entityType: 'customers',
          entityId: 'cust-1',
          operation: 'create',
          payload: { id: 'cust-1', name: 'John' },
          localVersion: 1,
          localTimestamp: new Date().toISOString(),
        },
      ];

      await sync.processBatch(mockContext, operations);
      expect(executeSpy).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('returns the full config', () => {
      const sync = createSyncEngine({
        entities: {
          customers: defineEntity('customers', {
            tableName: 'customers',
            fields: ['id'],
          }),
        },
        options: {
          batchSize: 50,
          maxRetries: 3,
        },
      });

      const config = sync.getConfig();
      expect(config.options?.batchSize).toBe(50);
      expect(config.options?.maxRetries).toBe(3);
    });
  });
});

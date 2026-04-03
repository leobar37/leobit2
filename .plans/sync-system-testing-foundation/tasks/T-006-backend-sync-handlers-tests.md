# T-006: Backend sync handlers tests

## Objetivo
Crear tests unitarios para los sync handlers del backend, verificando que procesan correctamente las operaciones y crean registros en `sync_operations`.

## Archivos a Crear
- `packages/backend/src/services/sync/handlers/__tests__/customer-sync-handler.test.ts`
- `packages/backend/src/services/sync/handlers/__tests__/sale-sync-handler.test.ts`
- `packages/backend/src/services/sync/handlers/__tests__/abono-sync-handler.test.ts`

## Estructura de Tests

```typescript
// packages/backend/src/services/sync/handlers/__tests__/customer-sync-handler.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { CustomerSyncHandler } from "../CustomerSyncHandler";
import type { SyncOperationInput } from "../../types";

describe("CustomerSyncHandler", () => {
  let handler: CustomerSyncHandler;
  let mockDeps: any;

  beforeEach(() => {
    // Setup mock dependencies
    mockDeps = {
      customerRepo: {
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    handler = new CustomerSyncHandler(mockDeps.customerRepo);
  });

  describe("executeInsert", () => {
    it("should create customer record", async () => {
      // Setup
      const operation: SyncOperationInput = {
        idempotencyKey: "key-1",
        entityType: "customers",
        entityId: "customer-1",
        operation: "create",
        payload: {
          name: "Test Customer",
          phone: "123456789",
          businessId: "biz-1",
        },
        localVersion: 1,
        localTimestamp: new Date().toISOString(),
      };

      mockDeps.customerRepo.findById.mockResolvedValue(null);
      mockDeps.customerRepo.create.mockResolvedValue({ id: "customer-1" });

      // Execute
      const result = await handler.executeInsert(operation, mockTx);

      // Assert
      expect(result.success).toBe(true);
      expect(mockDeps.customerRepo.create).toHaveBeenCalled();
    });

    it("should not create duplicate on idempotency", async () => {
      // Setup: customer already exists
      // Execute
      // Assert: findById called, create not called
    });
  });

  describe("executeUpdate", () => {
    it("should update existing customer", async () => {
      // Setup
      // Execute
      // Assert
    });

    it("should handle not found", async () => {
      // Setup: customer doesn't exist
      // Execute
      // Assert: returns error
    });
  });

  describe("validateBusinessRules", () => {
    it("should reject payload without name", async () => {
      // Setup
      // Execute
      // Assert: throws validation error
    });
  });
});
```

## Handlers a Testear

| Handler | Tests Mínimos | Entities |
|---------|---------------|----------|
| CustomerSyncHandler | 5 | customers |
| SaleSyncHandler | 5 | sales, sale_items |
| AbonoSyncHandler | 3 | abonos |
| ProductSyncHandler | 3 | products |
| ProductVariantSyncHandler | 3 | product_variants |
| TagSyncHandler | 2 | tags |
| DistribucionSyncHandler | 3 | distribuciones |

## Tests Comunes por Handler

1. **executeInsert** - crea registro correctamente
2. **executeUpdate** - actualiza registro existente
3. **executeDelete** - elimina registro
4. **validateBusinessRules** - rechaza payload inválido
5. **idempotency** - no duplica en retry

## Criterios de Aceptación

- [ ] Cada handler tiene al menos 3 tests unitarios
- [ ] Tests cubren casos de éxito y error
- [ ] Idempotency probada
- [ ] sync_operations se crea con status "processed"

## Notas
- Backend usa Vitest o Bun test (verificar package.json)
- Mocks de repositorios necesarios
- Tx mock para transacciones
- Considerar setup de DB en memoria si posible

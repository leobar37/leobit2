# AGENTS.md - Services Directory

> **Repository and Business Logic Layer for Avileo Backend**

## Overview

This directory contains the service layer implementing Repository and Business Logic patterns. All database access goes through repositories, and all business rules are implemented in services.

## Architecture

```
services/
├── repository/           # Data access layer (DB queries)
│   ├── order.repository.ts
│   ├── sale.repository.ts
│   ├── customer.repository.ts
│   ├── product.repository.ts
│   ├── inventory.repository.ts
│   └── payment.repository.ts
├── business/             # Business logic layer
│   ├── order.service.ts
│   ├── sale.service.ts
│   └── sync.service.ts
└── types.ts              # Shared service types
```

## Repository Pattern

Repositories handle all database access. They accept `RequestContext` as the first parameter.

### Repository Structure

```typescript
// services/repository/customer.repository.ts
import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";
import { customers } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";
import type { DbTransaction } from "../../lib/db";

export class CustomerRepository {
  // Always filter by businessId for multi-tenancy
  async findById(ctx: RequestContext, id: string, tx?: DbTransaction) {
    const dbOrTx = tx || db;
    
    const [customer] = await dbOrTx
      .select()
      .from(customers)
      .where(and(
        eq(customers.id, id),
        eq(customers.businessId, ctx.businessId)  // REQUIRED
      ));
    
    return customer;
  }

  async findMany(ctx: RequestContext, options?: { limit?: number }) {
    return db
      .select()
      .from(customers)
      .where(eq(customers.businessId, ctx.businessId))
      .limit(options?.limit || 100);
  }

  async create(
    ctx: RequestContext, 
    data: CreateCustomerInput,
    tx?: DbTransaction
  ) {
    const dbOrTx = tx || db;
    
    const [customer] = await dbOrTx
      .insert(customers)
      .values({
        ...data,
        businessId: ctx.businessId,
        createdBy: ctx.businessUserId,
      })
      .returning();
    
    return customer;
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<UpdateCustomerInput>,
    tx?: DbTransaction
  ) {
    const dbOrTx = tx || db;
    
    const [customer] = await dbOrTx
      .update(customers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(customers.id, id),
        eq(customers.businessId, ctx.businessId)
      ))
      .returning();
    
    return customer;
  }
}
```

## Service Pattern

Services implement business logic and orchestrate repositories. They use transactions for multi-step operations.

### Service Structure

```typescript
// services/business/order.service.ts
import { NotFoundError, ValidationError, ConflictError } from "../../errors";
import type { RequestContext } from "../../context/request-context";
import type { OrderRepository } from "../repository/order.repository";
import type { SaleService } from "./sale.service";

export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private saleService: SaleService
  ) {}

  async createOrder(ctx: RequestContext, input: CreateOrderInput) {
    // Validation
    if (!input.items?.length) {
      throw new ValidationError("Order must have at least one item");
    }

    // Business logic
    const total = input.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    // Repository call
    const order = await this.orderRepo.create(ctx, {
      ...input,
      total,
      status: "pending",
    });

    return order;
  }

  async confirmOrder(ctx: RequestContext, orderId: string) {
    const order = await this.orderRepo.findById(ctx, orderId);
    
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "pending") {
      throw new ConflictError("Order can only be confirmed from pending status");
    }

    // Transaction for atomic operations
    return db.transaction(async (tx) => {
      // Update order
      const updated = await this.orderRepo.update(
        ctx, 
        orderId, 
        { status: "confirmed" },
        tx
      );

      // Create sale from order
      await this.saleService.createFromOrder(ctx, order, tx);

      return updated;
    });
  }

  async updateVersion(
    ctx: RequestContext,
    id: string,
    data: UpdateOrderInput,
    baseVersion: number
  ) {
    // Optimistic concurrency control
    const result = await this.orderRepo.updateVersion(
      ctx,
      id,
      data,
      baseVersion
    );

    if (!result) {
      throw new ConflictError("Order was modified by another user");
    }

    return result;
  }
}
```

## RequestContext Rules

### 1. First Parameter Always

```typescript
// ✅ CORRECT
async findById(ctx: RequestContext, id: string)
async create(ctx: RequestContext, data: CreateInput)

// ❌ INCORRECT
async findById(id: string, ctx: RequestContext)
async create(data: CreateInput, ctx: RequestContext)
```

### 2. Multi-Tenancy Filtering

Every query MUST include `businessId` filter:

```typescript
// ✅ CORRECT
.where(and(
  eq(items.id, id),
  eq(items.businessId, ctx.businessId)
))

// ❌ INCORRECT - Missing tenant filter
.where(eq(items.id, id))
```

### 3. Transaction Support

Methods accept optional `tx` parameter:

```typescript
async create(
  ctx: RequestContext,
  data: CreateInput,
  tx?: DbTransaction
) {
  const dbOrTx = tx || db;
  // Use dbOrTx for all operations
}
```

## Error Handling

Services throw domain errors; plugin converts to HTTP responses:

```typescript
// services/business/order.service.ts
throw new NotFoundError("Order");           // 404
throw new ValidationError("Invalid input"); // 400
throw new ConflictError("Already exists");  // 409
throw new ForbiddenError("No permission");  // 403
```

## Dependency Injection

Services and repositories are instantiated in the services plugin:

```typescript
// plugins/services.ts
import { Elysia } from "elysia";
import { CustomerRepository } from "../services/repository/customer.repository";
import { CustomerService } from "../services/business/customer.service";

export const servicesPlugin = new Elysia({ name: "services" })
  .decorate(() => {
    // Single decorate call (required pattern)
    const customerRepo = new CustomerRepository();
    
    return {
      customerRepo,
      customerService: new CustomerService(customerRepo),
    };
  });
```

## Sync Service

Special service for handling offline sync:

```typescript
// services/business/sync.service.ts
export class SyncService {
  constructor(
    private customerRepo: CustomerRepository,
    private saleRepo: SaleRepository,
    // ... other repos
  ) {}

  async processBatch(ctx: RequestContext, operations: SyncOperation[]) {
    const results = [];

    for (const op of operations) {
      try {
        switch (op.entity) {
          case "customers":
            await this.processCustomerOperation(ctx, op);
            break;
          case "sales":
            await this.processSaleOperation(ctx, op);
            break;
          // ... other entities
        }
        results.push({ id: op.id, status: "success" });
      } catch (error) {
        results.push({ 
          id: op.id, 
          status: "error",
          error: error.message 
        });
      }
    }

    return results;
  }
}
```

## Key Files

| File | Purpose |
|------|---------|
| `repository/*.repository.ts` | Data access for each entity |
| `business/*.service.ts` | Business logic orchestration |
| `types.ts` | Shared interfaces and types |

---

*See [Backend AGENTS.md](../../AGENTS.md) for backend overview.*

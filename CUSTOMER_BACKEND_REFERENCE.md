# Avileo Customer Backend - Complete Reference

## Overview

This document maps all customer-related backend code in the Avileo system, including API routes, database schema, services, repositories, and validation patterns.

---

## 1. API Routes & Endpoints

### File: `packages/backend/src/api/customers.ts`

**Prefix:** `/customers`

#### Endpoints:

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| `GET` | `/` | `getCustomers()` | List all customers with pagination & search |
| `GET` | `/:id` | `getCustomer()` | Get single customer by ID |
| `GET` | `/:id/balance` | `getBalance()` | Get customer account balance (sales, payments, due) |
| `POST` | `/` | `createCustomer()` | Create new customer |
| `PUT` | `/:id` | `updateCustomer()` | Update customer details |
| `DELETE` | `/:id` | `deleteCustomer()` | Delete customer (admin only) |

#### Query/Body Validation Schemas:

**GET `/` Query Parameters:**
```typescript
{
  search?: string          // Search by customer name
  limit?: string           // Results per page (parsed to int)
  offset?: string          // Pagination offset (parsed to int)
}
```

**POST `/` Body Schema:**
```typescript
{
  name: string             // Required, min 2 chars
  dni?: string             // Optional: national ID
  phone?: string           // Optional: phone number
  address?: string         // Optional: address
  notes?: string           // Optional: notes
}
```

**PUT `/:id` Body Schema:**
```typescript
{
  name?: string            // Optional, min 2 chars
  dni?: string             // Optional, unique check
  phone?: string           // Optional
  address?: string         // Optional
  notes?: string           // Optional
}
```

**DELETE `/:id` Params:**
```typescript
{
  id: string               // Customer UUID
}
```

**All responses follow standard format:**
```typescript
{
  success: true,
  data: Customer | Customer[]
}
```

---

## 2. Database Schema

### File: `packages/backend/src/db/schema/customers.ts`

**Table Name:** `customers`

#### Column Definitions:

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK, auto-generated | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Customer name |
| `dni` | VARCHAR(20) | Nullable | National identification number |
| `phone` | VARCHAR(50) | Nullable | Contact phone |
| `address` | TEXT | Nullable | Street address |
| `notes` | TEXT | Nullable | Custom notes/observations |
| `sync_status` | ENUM | NOT NULL, default: 'pending' | Offline-first sync status |
| `sync_attempts` | INTEGER | NOT NULL, default: 0 | Failed sync attempt counter |
| `business_id` | UUID | NOT NULL, FK | Foreign key to `businesses.id` |
| `created_by` | UUID | Nullable, FK | Foreign key to `business_users.id` |
| `created_at` | TIMESTAMP | NOT NULL, default: NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, default: NOW() | Last update timestamp |

#### Indexes:

```sql
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_dni ON customers(dni);
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_customers_sync_status ON customers(sync_status);
CREATE INDEX idx_customers_created_by ON customers(created_by);
```

#### Type Exports:

```typescript
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
```

#### Relations:

```typescript
customersRelations {
  business: One-to-One with businesses
  createdByUser: One-to-One with business_users
}
```

---

## 3. Repository Layer

### File: `packages/backend/src/services/repository/customer.repository.ts`

The repository implements data access patterns with **RequestContext** as first parameter for multi-tenancy.

#### Class: `CustomerRepository`

##### Methods:

**`findMany(ctx, filters?): Promise<Customer[]>`**
- Fetches customers for the business
- **Filters:**
  - `search?: string` - LIKE search on name
  - `limit?: number` - Pagination limit
  - `offset?: number` - Pagination offset
- **Query:** Filters by `businessId`, ordered by `createdAt` DESC
- **Returns:** Array of customers

**`findById(ctx, id): Promise<Customer | undefined>`**
- Fetches single customer by ID
- **Multi-tenancy:** Validates businessId match
- **Returns:** Customer or undefined

**`findByDni(ctx, dni): Promise<Customer | undefined>`**
- Fetches customer by national ID
- **Use case:** Uniqueness validation on create/update
- **Multi-tenancy:** Validates businessId match
- **Returns:** Customer or undefined

**`create(ctx, data): Promise<Customer>`**
- Creates new customer
- **Auto-populated fields:**
  - `businessId` - from context
  - `createdBy` - from context.businessUserId
  - `id` - UUID auto-generated
  - `createdAt`, `updatedAt` - NOW()
- **Returns:** Created customer

**`update(ctx, id, data): Promise<Customer | undefined>`**
- Updates customer fields (selective)
- **Multi-tenancy:** Validates businessId match
- **Conditional updates:** Only sets provided fields
- **Returns:** Updated customer or undefined

**`delete(ctx, id): Promise<void>`**
- Soft or hard delete (implementation detail)
- **Multi-tenancy:** Validates businessId match
- **Returns:** void

**`count(ctx): Promise<number>`**
- Returns total customer count for business
- **Query:** Uses SQL COUNT(*)

#### Accounts Receivable Methods:

**`getAccountsReceivable(ctx, filters?): Promise<AccountsReceivableItem[]>`**
- Complex query: customers with outstanding credit balances
- **Joins:** customers LEFT JOIN sales LEFT JOIN abonos
- **Calculation:** totalDebt = (credit sales) - (payments/abonos)
- **Filters:**
  - `search?: string` - LIKE on customer name
  - `minBalance?: number` - Only customers with balance >= minBalance
  - `limit?: number` - Default: 100
  - `offset?: number` - Default: 0
- **Returns:** Array of `AccountsReceivableItem[]`

**`getTotalAccountsReceivable(ctx): Promise<number>`**
- Single aggregate: total outstanding balance across all customers
- **Calculation:** SUM of (credit sales - payments) for business
- **Returns:** Numeric total

**`getBalance(ctx, customerId): Promise<{ totalSales, totalPayments, balanceDue }>`**
- Single customer balance breakdown
- **Calculation:**
  - `totalSales` - sum of credit sales
  - `totalPayments` - sum of abonos (payments)
  - `balanceDue` - max(totalSales - totalPayments, 0)
- **Returns:** Balance object

#### Type Definitions:

```typescript
interface AccountsReceivableItem {
  customer: Customer;
  totalDebt: number;           // Outstanding balance
  totalSales: number;          // Total credit sales
  totalPayments: number;       // Total payments received
  lastSaleDate: Date | null;   // Most recent sale
}
```

---

## 4. Service Layer

### File: `packages/backend/src/services/business/customer.service.ts`

Implements business logic with permission checks and validation.

#### Class: `CustomerService`

**Constructor:** Takes `CustomerRepository` as dependency

##### Methods:

**`getCustomers(ctx, filters?): Promise<Customer[]>`**
- **Permission:** Requires `customers.read`
- **Throws:** `ForbiddenError` if no permission
- **Delegates:** `repository.findMany(ctx, filters)`

**`getCustomer(ctx, id): Promise<Customer>`**
- **Permission:** Requires `customers.read`
- **Throws:** `NotFoundError("Cliente")` if not found
- **Validation:** Ensures customer exists
- **Returns:** Single customer or throws

**`createCustomer(ctx, data): Promise<Customer>`**
- **Permission:** Requires `customers.write`
- **Validations:**
  - Name must be ≥ 2 characters
  - DNI must be unique (if provided)
- **Throws:**
  - `ForbiddenError` - No permission
  - `ValidationError` - Validation fails
- **Returns:** Created customer

**`updateCustomer(ctx, id, data): Promise<Customer>`**
- **Permission:** Requires `customers.write`
- **Validations:**
  - Customer must exist
  - Name (if provided) must be ≥ 2 characters
  - DNI (if provided) must be unique
  - DNI uniqueness check only if changing value
- **Throws:**
  - `ForbiddenError` - No permission
  - `ValidationError` - Validation fails
  - `NotFoundError("Cliente")` - Customer not found
- **Returns:** Updated customer

**`deleteCustomer(ctx, id): Promise<void>`**
- **Permission:** Admin-only (calls `ctx.isAdmin()`)
- **Validations:** Customer must exist
- **Throws:**
  - `ForbiddenError` - Not admin
  - `NotFoundError("Cliente")` - Not found
- **Returns:** void

**`countCustomers(ctx): Promise<number>`**
- **Permission:** Requires `customers.read`
- **Returns:** Total count for business

#### Accounts Receivable Methods:

**`getAccountsReceivable(ctx, filters?): Promise<AccountsReceivableItem[]>`**
- **Permission:** Requires `reports.view`
- **Delegates:** `repository.getAccountsReceivable(ctx, filters)`
- **Returns:** Array with debt info

**`getTotalAccountsReceivable(ctx): Promise<number>`**
- **Permission:** Requires `reports.view`
- **Delegates:** `repository.getTotalAccountsReceivable(ctx)`
- **Returns:** Total outstanding balance

**`getBalance(ctx, customerId): Promise<balance>`**
- **Permission:** Requires `customers.read`
- **Validations:** Customer must exist
- **Throws:** `NotFoundError("Cliente")` if not found
- **Returns:** Balance breakdown

---

## 5. Related Reporting Endpoints

### File: `packages/backend/src/api/reports.ts`

Accounts receivable reports use customer data.

#### Endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/reports/accounts-receivable` | List customers with outstanding balances |
| `GET` | `/reports/accounts-receivable/total` | Total outstanding balance across all customers |

**Query Parameters (accounts-receivable):**
```typescript
{
  search?: string           // Search customer name
  minBalance?: string       // Filter by minimum balance (parsed to float)
  limit?: string            // Page size
  offset?: string           // Page offset
}
```

**Response Format:**
```typescript
{
  success: true,
  data: AccountsReceivableItem[] | { total: number }
}
```

---

## 6. Dependency Injection

### File: `packages/backend/src/plugins/services.ts`

Single `decorate()` call provides all service instances.

```typescript
.decorate(() => ({
  customerRepo: new CustomerRepository(),
  customerService: new CustomerService(customerRepo),
  // ... other services
}))
```

**Injection Pattern:**
- Routes access via destructuring: `{ customerService, ctx }`
- Single construction per request
- Cached in Elysia context

---

## 7. Integration Points

### Sync Service
**File:** `packages/backend/src/services/sync/sync.service.ts`
- CustomerRepository passed to sync engine
- Syncs customer changes from offline clients

### Sales Service
**File:** `packages/backend/src/services/business/sale.service.ts`
- Creates sales linked to customer `clientId`
- References `customers` table

### Payment Service
**File:** `packages/backend/src/services/business/payment.service.ts`
- Records abonos (payments) linked to customers
- Updates customer balance indirectly

### Schema Exports
**File:** `packages/backend/src/db/schema/index.ts`
- Exports `customers` table and types

---

## 8. Multi-Tenancy Pattern

All customer queries include **mandatory** businessId filter:

```typescript
// In repository methods:
.where(and(
  eq(customers.id, id),
  eq(customers.businessId, ctx.businessId)  // REQUIRED
))
```

**RequestContext fields used:**
- `ctx.businessId` - Filter all queries by this
- `ctx.businessUserId` - Set as creator on insert
- `ctx.hasPermission(permission)` - Check access
- `ctx.isAdmin()` - Admin-only operations

---

## 9. Permission Model

Customer operations require these permissions:

| Operation | Permission Required |
|-----------|-------------------|
| List customers | `customers.read` |
| View customer | `customers.read` |
| Get balance | `customers.read` |
| Create customer | `customers.write` |
| Update customer | `customers.write` |
| Delete customer | Admin only (`ctx.isAdmin()`) |
| View reports | `reports.view` |

---

## 10. Offline-First Fields

Customer records include sync fields:

| Field | Type | Purpose |
|-------|------|---------|
| `sync_status` | ENUM | pending, synced, failed |
| `sync_attempts` | INTEGER | Count of failed sync attempts |

Repository has methods to update these:
```typescript
syncStatus: data.syncStatus
syncAttempts: data.syncAttempts
```

---

## 11. Error Handling

Custom error classes thrown by service layer:

```typescript
throw new NotFoundError("Cliente");        // 404
throw new ForbiddenError("No permisos");   // 403
throw new ValidationError("Invalid input"); // 400
```

All caught by global error handler in plugin.

---

## 12. File Summary Table

| File | Lines | Purpose |
|------|-------|---------|
| `customers.ts` (schema) | 68 | Drizzle table definition + types |
| `customers.ts` (api) | 99 | 6 endpoints (GET, POST, PUT, DELETE) |
| `customer.repository.ts` | 259 | 9 database query methods |
| `customer.service.ts` | 172 | 8 business logic methods with permissions |
| `reports.ts` | 36 | 2 accounts receivable report endpoints |
| `services.ts` (plugin) | 100 | Dependency injection container |

---

## Quick Start Examples

### Create Customer
```bash
POST /customers
Content-Type: application/json

{
  "name": "Pepe García",
  "dni": "12345678",
  "phone": "+1234567890",
  "address": "Calle Principal 123",
  "notes": "Compra los viernes"
}

# Response: 201
{
  "success": true,
  "data": {
    "id": "uuid...",
    "name": "Pepe García",
    "dni": "12345678",
    "businessId": "uuid...",
    "syncStatus": "pending",
    ...
  }
}
```

### List Customers
```bash
GET /customers?search=Pepe&limit=10&offset=0

# Response: 200
{
  "success": true,
  "data": [
    { "id": "uuid...", "name": "Pepe García", ... }
  ]
}
```

### Get Customer Balance
```bash
GET /customers/{id}/balance

# Response: 200
{
  "success": true,
  "data": {
    "totalSales": 1500.00,
    "totalPayments": 500.00,
    "balanceDue": 1000.00
  }
}
```

### Accounts Receivable Report
```bash
GET /reports/accounts-receivable?minBalance=100&limit=50

# Response: 200
{
  "success": true,
  "data": [
    {
      "customer": { "id": "uuid...", "name": "Pepe García", ... },
      "totalDebt": 1000.00,
      "totalSales": 1500.00,
      "totalPayments": 500.00,
      "lastSaleDate": "2025-02-20T15:30:00Z"
    }
  ]
}
```

---

## Validation Rules Summary

| Field | Rules |
|-------|-------|
| `name` | Required, min 2 chars |
| `dni` | Optional, must be unique per business |
| `phone` | Optional, free text |
| `address` | Optional, free text |
| `notes` | Optional, free text |

---

## Related Tables

Customer records relate to:

| Table | Relation | Purpose |
|-------|----------|---------|
| `businesses` | FK (business_id) | Customer belongs to one business |
| `business_users` | FK (created_by) | Track creator |
| `sales` | FK (clientId) | Sales records link to customers |
| `abonos` | FK (clientId) | Payments link to customers |

---

**Generated:** February 2025  
**Project:** Avileo (PollosPro)

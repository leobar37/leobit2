# Electric and Sales Sync Considerations

> Practical notes learned while debugging `/ventas`, Electric sync, and multi-tenant auth.

**Last updated:** March 11, 2026

---

## Purpose

This document captures the main failure modes we hit while debugging sales sync and the `/ventas` UI.
The goal is to avoid reintroducing the same regressions when changing:

- Electric proxying
- TanStack DB collections
- sales/customer schemas
- business context and seller filtering
- loading and retry behavior in the UI

---

## Core Rules

### 1. Electric must go through the backend proxy

The browser must **not** call Electric Cloud directly when the app needs multi-tenant context.

Why:

- the app sends `x-business-id`
- Electric Cloud rejects that custom header in browser CORS preflight
- this causes silent empty collections or retry loops in the UI

Required pattern:

- frontend shapes point to `VITE_API_URL + /electric`
- backend proxy adds the Electric service token
- backend proxy applies tenant filters using `ctx.businessId`

Do not rely on:

- `VITE_ELECTRIC_URL=https://api.electric-sql.cloud/v1/shape` from the browser

---

### 2. `sellerId` in sales must use `businessUserId`, not `user.id`

Sales are scoped to `business_users.id`, not the global auth user ID.

Implication:

- creating drafts with `user.id` makes them disappear after sync
- filtering sales with `user.id` returns empty results even when the business has sales

Required pattern:

- use `business.businessUserId` when creating a sale
- vendor views filter by `business.businessUserId`
- `ADMIN_NEGOCIO` views should usually not filter by seller

---

### 3. The app must be consistent about `customerId` vs `clientId`

The current unified sales model uses:

- `customerId`
- `customer`

Old code still using:

- `clientId`
- `client`

can break:

- collection sync
- joins with customers
- local filters
- draft creation/update logic

Before changing sales code, verify all of these layers use the same naming:

- `packages/app/app/lib/db/schemas/sale.ts`
- `packages/app/app/lib/db/collections/sale.collection.ts`
- `packages/app/app/hooks/use-sales-db.ts`
- sales routes/components

---

### 4. Electric shapes need snake_case to camelCase mapping

Postgres and Electric shapes are delivered in `snake_case`.
The app state and Zod schemas are in `camelCase`.

Without a `columnMapper`, data can exist in the stream but fail to match app queries.

Required pattern:

- `shapeOptions.columnMapper = snakeCamelMapper()`

This matters especially for fields like:

- `business_id -> businessId`
- `customer_id -> customerId`
- `seller_id -> sellerId`
- `created_at -> createdAt`

---

### 5. Multi-tenant Electric filtering must be table-aware

Not every synced table has a direct `business_id` column.

Examples:

- `customers`, `sales`, `products` can filter directly with `business_id = ...`
- `sale_items` must filter via `sale_id`
- `product_variants` must filter via `product_id`

If the proxy blindly applies `business_id = ...` to every table, Electric returns SQL errors like:

- `unknown reference business_id`

The tenant filter logic belongs in the backend proxy, not in the browser.

---

### 6. Do not retry Electric forever on permanent errors

Returning `{}` from `shapeOptions.onError` tells Electric to retry.

That is correct for:

- network failures
- `5xx`
- `429`

That is wrong for:

- `404`
- malformed requests
- invalid auth/business context

If permanent errors always return `{}`, the UI can get stuck in noisy infinite loops.

---

### 7. Avoid transitional empty or phantom states in `useSales`

`useSales()` should not query “too early” before business context is available.

What happened:

- first render had incomplete business context
- the query ran with unstable filters
- UI briefly showed wrong data or empty data

Safer pattern:

- use a pending sentinel for `businessId`
- return `[]` until business context is actually ready
- prefer `getStoredBusinessId()` only as fallback, not as the primary source of truth

---

### 8. Loading UI should not render alongside ready data

If `isLoading` remains `true` while some data is already available, the page can show:

- list items
- and "Cargando ventas..."

at the same time.

Safer pattern:

- only show loading placeholders when `isLoading && !hasItems`

This is a UI rule, not a data rule.

---

## Warning Signs

If any of these appear again, check this document first:

- sales appear briefly and then disappear
- `/ventas` logs `Sales []` while backend has rows
- Electric CORS errors mentioning `x-business-id`
- Electric `404` or infinite retry loops
- customer data exists but filters do not match
- draft sales are created but cannot be found later
- items syncs work in one table but fail in `sale_items`

---

## Files That Deserve Extra Care

- `packages/app/app/lib/db/collections/utils.ts`
- `packages/app/app/lib/db/collections/sale.collection.ts`
- `packages/app/app/lib/db/collections/sale-item.collection.ts`
- `packages/app/app/hooks/use-sales-db.ts`
- `packages/app/app/hooks/use-sales.ts`
- `packages/app/app/routes/_protected.ventas._index.tsx`
- `packages/backend/src/api/electric.ts`
- `packages/backend/src/plugins/context.ts`
- `packages/backend/src/services/business/business.service.ts`

---

## Recommended Checklist Before Merging Sales/Electric Changes

1. Confirm the browser is calling `/electric` on the backend, not Electric Cloud directly.
2. Confirm `/businesses/me` returns the fields required by the frontend, especially `businessUserId`.
3. Confirm `sale.collection.ts` uses `customerId`, not `clientId`.
4. Confirm `shapeOptions` includes auth headers, `x-business-id`, and `snakeCamelMapper()`.
5. Confirm vendor filtering uses `businessUserId`.
6. Confirm `ADMIN_NEGOCIO` can see business-wide sales when intended.
7. Confirm loading states do not overlap with rendered list content.
8. Confirm Electric `onError` retries only retryable failures.

---

## Short Version

If `/ventas` breaks again, verify these in order:

1. Is the frontend calling backend `/electric`?
2. Is the backend proxy mounted and filtering by business correctly?
3. Is `businessUserId` present and used for seller filtering?
4. Is the sales model using `customerId/customer` consistently?
5. Is Electric mapping `snake_case` to `camelCase`?


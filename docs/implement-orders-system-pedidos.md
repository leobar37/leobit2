# Implement: Orders System (Pedidos) for Avileo

**Status**: planning  
**Priority**: high  
**Estimated Effort**: 8-10 days  
**Created**: 2025-02-21  
**Branch**: feature/orders-system  
**Last Commit**: HEAD

---

## 1. Context & Situation Analysis

### Current State
- **Project**: Avileo (PollosPro) - Offline-first chicken sales management system
- **Stack**: Bun + ElysiaJS + Drizzle ORM + PostgreSQL + React Router v7 + TanStack Query
- **What was being done**: Comprehensive analysis of existing sales system completed. System has working offline-first sales with full CRUD, sync engine, and inventory management.
- **Where we are now**: Analysis phase complete. Ready to implement Orders feature that allows customers to place orders one day in advance with modification capabilities.
- **Blockers**: None. All prerequisite infrastructure exists.

### Problem Statement
- **Objective**: Implement an Orders (Pedidos) system where:
  1. Customers place orders one day before delivery
  2. Orders can be modified until delivery day
  3. On delivery, orders convert to official sales
  4. Full offline-first support throughout the flow
- **Why it matters**: Business requirement - customers often order in advance and need to modify items/quantities before delivery. Current system only handles immediate sales.
- **Success looks like**:
  1. Vendor can create orders with delivery date = tomorrow or later
  2. Vendor can modify order items before delivery
  3. On delivery day, one-click conversion to sale
  4. Works 100% offline with sync when online
  5. Audit trail of modifications

### Constraints & Assumptions
- **Must use**:
  - Existing sync architecture (syncStatus, syncAttempts fields)
  - Repository pattern with RequestContext as first parameter
  - ElysiaJS for API routes with t.* validation
  - Drizzle ORM with existing schema patterns
  - React Router v7 file-based routing
  - TanStack Query + IndexedDB for offline state
  - Same UI patterns as existing sales screens
- **Must avoid**:
  - Modifying existing sales table structure (except adding order_id nullable FK)
  - Breaking existing offline sync logic
  - Type error suppression (as any, @ts-ignore)
  - Inline styles - use Tailwind classes only
- **Assumptions**:
  - One order = one sale (no partial deliveries in MVP)
  - Orders cannot be for same-day delivery (minimum 1 day advance)
  - Prices are locked at order confirmation time
  - Only confirmed orders can be converted to sales

---

## 2. Technical Inventory

### Files Currently Involved
| File | Purpose | Status | Lines/Functions |
|------|---------|--------|-----------------|
| `packages/backend/src/db/schema/sales.ts` | Reference for sales table pattern | existing | sales:21-66, sale_items:69-97 |
| `packages/backend/src/db/schema/enums.ts` | Enum definitions | existing | syncStatusEnum:17-21, saleTypeEnum:24 |
| `packages/backend/src/api/sales.ts` | Reference for API pattern | existing | saleRoutes:6-99 |
| `packages/backend/src/services/business/sale.service.ts` | Reference for service pattern | existing | SaleService:11-246 |
| `packages/backend/src/services/repository/sale.repository.ts` | Reference for repository pattern | existing | SaleRepository:1-140 |
| `packages/app/app/hooks/use-sales.ts` | Reference for frontend hooks | existing | useCreateSale:33-91 |
| `packages/app/app/routes/_protected.ventas.nueva.tsx` | Reference for sales form UI | existing | NewSalePage:44-545 |
| `packages/app/app/routes/_protected.ventas._index.tsx` | Reference for list UI | existing | SalesPage:12-110 |
| `packages/backend/src/services/sync/sync.service.ts` | Sync engine integration | existing | applyOperation + entity-specific handlers |

### Architecture Context
- **Pattern to follow**: Repository pattern with RequestContext as first parameter, Service layer with business logic, Elysia routes for API
- **Existing similar implementations**: Sales system (sale.service.ts, sale.repository.ts, sales.ts routes)
- **APIs/Interfaces involved**: 
  - Better Auth for authentication
  - Drizzle ORM for database
  - TanStack Query for frontend state
  - Eden Treaty for type-safe API client

---

## 3. Execution Plan

### Phase 1: Database Schema & Backend Core [Estimated: 3 days]
**Goal**: Create database tables, enums, and backend service layer for orders
**Prerequisites**: None
**Definition of Done**: Database migration created and applied, backend API returns 200 for CRUD operations

#### Step 1.1: Create Order Status Enum
- **Action**: Add order_status enum to existing enums.ts file
- **Files**: `packages/backend/src/db/schema/enums.ts`
- **Details**:
  - Add orderStatusEnum with values: draft, confirmed, cancelled, delivered
  - Add to exports in index.ts
- **Acceptance Criteria**:
  - [ ] Enum created with 4 states
  - [ ] Exported from index.ts
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Estimated Time**: 15 minutes

#### Step 1.2: Create Orders Schema
- **Action**: Create new schema file for orders and order_items tables
- **Files**: `packages/backend/src/db/schema/orders.ts` (new)
- **Details**:
  - Create orders table with fields: id, businessId, clientId, sellerId, deliveryDate, orderDate, status, paymentIntent, totalAmount, confirmedSnapshot, deliveredSnapshot, version, syncStatus, syncAttempts, createdAt, updatedAt
  - Use `sales.orderId` as the canonical conversion link (unique FK). Avoid duplicating link state in `orders` with `convertedToSaleId`.
  - Create order_items table with fields: id, orderId, productId, variantId, productName, variantName, orderedQuantity, deliveredQuantity, unitPriceQuoted, unitPriceFinal, isModified, originalQuantity
  - Add proper indexes: businessId+deliveryDate+status, businessId+clientId, businessId+syncStatus
  - Add relations definitions
- **Acceptance Criteria**:
  - [ ] Tables follow existing naming conventions (snake_case in DB, camelCase in TS)
  - [ ] All FKs have proper references
  - [ ] Indexes defined for common queries
  - [ ] Type exports included (Order, NewOrder, OrderItem, NewOrderItem)
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Estimated Time**: 45 minutes

#### Step 1.3: Create Order Events Schema
- **Action**: Create audit trail table for order modifications
- **Files**: `packages/backend/src/db/schema/order-events.ts` (new)
- **Details**:
  - Create order_events table with fields: id, orderId, eventType, payload, clientEventId, createdByBusinessUserId, createdAt
  - Event types: created, updated, item_added, item_updated, item_removed, confirmed, cancelled, delivered, repriced
  - Add unique constraint on clientEventId for idempotency
- **Acceptance Criteria**:
  - [ ] Table created with all fields
  - [ ] Event type enum defined
  - [ ] Proper FK to orders with cascade delete
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Estimated Time**: 30 minutes

#### Step 1.4: Update Schema Index Exports
- **Action**: Export new schemas from schema/index.ts
- **Files**: `packages/backend/src/db/schema/index.ts`
- **Details**:
  - Add exports for orders, order_items, order_events
  - Add exports for orderStatusEnum
- **Acceptance Criteria**:
  - [ ] All new schemas exported
  - [ ] No circular dependencies
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Dependencies**: Step 1.2, Step 1.3
- **Estimated Time**: 15 minutes

#### Step 1.5: Modify Sales Schema to Link Orders
- **Action**: Add optional order_id column to sales table
- **Files**: `packages/backend/src/db/schema/sales.ts`
- **Details**:
  - Add orderId column: uuid("order_id").references(() => orders.id).unique()
  - Add index on orderId
  - Update relations to include optional order relation
- **Acceptance Criteria**:
  - [ ] order_id column added
  - [ ] Unique constraint prevents duplicate conversions
  - [ ] Index added for query performance
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Dependencies**: Step 1.2
- **Estimated Time**: 15 minutes

#### Step 1.6: Create Database Migration
- **Action**: Generate Drizzle migration for new tables
- **Files**: `packages/backend/drizzle/` (new migration files)
- **Details**:
  - Run `bun run db:generate` to create migration
  - Review generated SQL for correctness
  - Apply migration with `bun run db:migrate`
- **Acceptance Criteria**:
  - [ ] Migration file generated
  - [ ] Migration applies successfully
  - [ ] Tables visible in database
- **Validation Command**: `cd packages/backend && bun run db:migrate`
- **Dependencies**: Step 1.2, Step 1.3, Step 1.5
- **Estimated Time**: 20 minutes

#### Step 1.7: Create Order Repository
- **Action**: Implement data access layer for orders
- **Files**: `packages/backend/src/services/repository/order.repository.ts` (new)
- **Details**:
  - Implement findMany(ctx, filters) with pagination and date filtering
  - Implement findById(ctx, id) with items eager loading
  - Implement create(ctx, data, tx) that inserts order + items in transaction
  - Implement update(ctx, id, data) for status and field updates
  - Implement updateVersion(ctx, id, version) for optimistic locking
  - All methods must filter by ctx.businessId
- **Acceptance Criteria**:
  - [ ] All CRUD operations implemented
  - [ ] Proper RequestContext usage as first parameter
  - [ ] BusinessId filtering on all queries
  - [ ] TypeScript types correct
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Estimated Time**: 90 minutes

#### Step 1.8: Create Order Events Repository
- **Action**: Implement audit trail repository
- **Files**: `packages/backend/src/services/repository/order-events.repository.ts` (new)
- **Details**:
  - Implement create(ctx, data) for events
  - Implement findByOrderId(ctx, orderId) for history
  - Implement findByClientEventId(ctx, clientEventId) for idempotency check
- **Acceptance Criteria**:
  - [ ] Event creation implemented
  - [ ] History query implemented
  - [ ] Idempotency check implemented
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Estimated Time**: 30 minutes

#### Step 1.9: Create Order Service
- **Action**: Implement business logic layer
- **Files**: `packages/backend/src/services/business/order.service.ts` (new)
- **Details**:
  - getOrders(ctx, filters): List with date/status filtering
  - getOrder(ctx, id): Get single with items
  - createOrder(ctx, data): Create draft order, validate deliveryDate >= tomorrow
  - updateOrder(ctx, id, data): Update if status is draft or confirmed
  - confirmOrder(ctx, id, baseVersion): Confirm order, lock prices, create snapshot
  - cancelOrder(ctx, id, baseVersion): Cancel order
  - modifyOrderItem(ctx, orderId, itemId, newQuantity, baseVersion): Modify item quantity
  - convertToSale(ctx, orderId, deliveredData, baseVersion): Convert to sale (calls SaleService internally)
  - All state transitions must validate version for optimistic locking
  - All operations must log events to OrderEventsRepository
- **Acceptance Criteria**:
  - [ ] All business methods implemented
  - [ ] State machine enforced (valid transitions only)
  - [ ] Version checking for optimistic locking
  - [ ] Event logging on all state changes
  - [ ] Proper error types (ValidationError, NotFoundError, ConflictError)
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Dependencies**: Step 1.7, Step 1.8
- **Estimated Time**: 180 minutes

#### Step 1.10: Extend Sale Service with Order Conversion
- **Action**: Add method to create sale from order
- **Files**: `packages/backend/src/services/business/sale.service.ts`
- **Details**:
  - Add createFromOrder(ctx, orderId, tx) method
  - Load order with items
  - Validate order is confirmed and not already converted
  - Create sale with orderId FK set
  - Copy items from order_items to sale_items
  - Use provided transaction (tx) for atomicity
- **Acceptance Criteria**:
  - [ ] Method implemented
  - [ ] Transaction safety ensured
  - [ ] Idempotency (check if already converted)
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Dependencies**: Step 1.5, Step 1.9
- **Estimated Time**: 60 minutes

#### Step 1.11: Create Orders API Routes
- **Action**: Implement REST endpoints
- **Files**: `packages/backend/src/api/orders.ts` (new)
- **Details**:
  - GET /orders - List with query params: deliveryDate, status, limit, offset
  - GET /orders/:id - Get single order
  - POST /orders - Create order
  - PUT /orders/:id - Update order (items, delivery date)
  - POST /orders/:id/confirm - Confirm order
  - POST /orders/:id/cancel - Cancel order
  - POST /orders/:id/deliver - Convert to sale (returns { order, sale })
  - PATCH /orders/:id/items/:itemId - Modify item quantity
  - All routes use Elysia t.* validation
  - All routes pass ctx to service methods
- **Acceptance Criteria**:
  - [ ] All endpoints return proper response shapes
  - [ ] Validation schemas defined
  - [ ] Proper HTTP status codes
  - [ ] Error handling consistent with sales.ts
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Dependencies**: Step 1.9, Step 1.10
- **Estimated Time**: 120 minutes

#### Step 1.12: Register Orders Routes
- **Action**: Add orders routes to main app
- **Files**: `packages/backend/src/index.ts`
- **Details**:
  - Import orderRoutes
  - Add .use(orderRoutes) to Elysia app
- **Acceptance Criteria**:
  - [ ] Routes registered
  - [ ] Server starts without errors
- **Validation Command**: `cd packages/backend && bun run dev` (verify no startup errors)
- **Dependencies**: Step 1.11
- **Estimated Time**: 10 minutes

#### Step 1.13: Update Sync Service
- **Action**: Add orders to sync engine
- **Files**: `packages/backend/src/services/sync/sync.service.ts`
- **Details**:
  - Add "orders" and "order_items" to SyncEntity type
  - Add `applyOrdersOperation()` and wire it in `applyOperation()` switch-case
  - Keep `order_items` nested under `orders` (same strategy used for `sale_items`: no direct sync operation for item rows)
- **Acceptance Criteria**:
  - [ ] Orders included in sync entities
  - [ ] Sync operations handle orders
- **Validation Command**: `cd packages/backend && bun run typecheck`
- **Dependencies**: Step 1.9
- **Estimated Time**: 30 minutes

### Phase 2: Frontend Hooks & State Management [Estimated: 2 days]
**Goal**: Create frontend hooks for orders with offline support
**Prerequisites**: Phase 1 complete, backend API running
**Definition of Done**: Frontend can CRUD orders offline with sync when online

#### Step 2.1: Update Shared Types
- **Action**: Add order types to shared package
- **Files**: `packages/shared/src/index.ts`
- **Details**:
  - Add OrderStatus type: 'draft' | 'confirmed' | 'cancelled' | 'delivered'
  - Add Order interface
  - Add OrderItem interface
  - Add CreateOrderInput, UpdateOrderInput types
- **Acceptance Criteria**:
  - [ ] Types exported from shared
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/shared && bun run build`
- **Estimated Time**: 30 minutes

#### Step 2.2: Update Frontend Schema
- **Action**: Add Zod schemas for orders
- **Files**: `packages/app/app/lib/db/schema.ts`
- **Details**:
  - Add orderSchema and orderItemSchema
  - Update `syncOperationSchema` entity `z.enum([...])` to include `'orders'` and `'order_items'`
  - Keep frontend entity enum values aligned with backend `SyncEntity` union
- **Acceptance Criteria**:
  - [ ] Schemas match backend types
  - [ ] Sync entities updated
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Step 2.1
- **Estimated Time**: 20 minutes

#### Step 2.3: Create UseOrders Hook
- **Action**: Implement TanStack Query hooks for orders
- **Files**: `packages/app/app/hooks/use-orders.ts` (new)
- **Details**:
  - useOrders(filters) - List orders with filters
  - useOrder(id) - Get single order
  - useCreateOrder() - Mutation to create (with offline support)
  - useUpdateOrder() - Mutation to update
  - useConfirmOrder() - Mutation to confirm
  - useCancelOrder() - Mutation to cancel
  - useDeliverOrder() - Mutation to convert to sale
  - useModifyOrderItem() - Mutation to modify item
  - Follow pattern from use-sales.ts
  - All mutations must handle offline by enqueuing to syncClient
- **Acceptance Criteria**:
  - [ ] All hooks implemented
  - [ ] Offline support with syncClient.enqueueOperation
  - [ ] Proper query invalidation on mutations
  - [ ] Optimistic updates where appropriate
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Step 2.2
- **Estimated Time**: 120 minutes

#### Step 2.4: Create Order Store (Jotai)
- **Action**: Create modal state for order editing
- **Files**: `packages/app/app/lib/modal/order-modal.ts` (new)
- **Details**:
  - Create order modal using createModal pattern
  - For order item editing modal
- **Acceptance Criteria**:
  - [ ] Modal factory created
  - [ ] Exports useOrderModal hook
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Estimated Time**: 20 minutes

### Phase 3: Frontend UI Components [Estimated: 3 days]
**Goal**: Build order list, create, and detail screens
**Prerequisites**: Phase 2 complete
**Definition of Done**: Full UI flow working, can create/modify/convert orders

#### Step 3.1: Create Order Card Component
- **Action**: Create card for order list
- **Files**: `packages/app/app/components/orders/order-card.tsx` (new)
- **Details**:
  - Display: customer name, delivery date, total, status badge
  - Actions: view, edit (if draft/confirmed), convert (if confirmed and delivery date is today)
  - Follow design pattern from sale-card.tsx
- **Acceptance Criteria**:
  - [ ] Component renders correctly
  - [ ] Status badges match design system
  - [ ] Action buttons conditionally rendered
- **Validation Command**: Visual verification in browser
- **Estimated Time**: 45 minutes

#### Step 3.2: Create Order Form Component
- **Action**: Create form for creating/editing orders
- **Files**: `packages/app/app/components/orders/order-form.tsx` (new)
- **Details**:
  - Customer selection (reuse CustomerSearch)
  - Delivery date picker (min = tomorrow)
  - Payment intent selection (contado/credito)
  - Notes field
  - Items section (add/remove/modify quantities)
  - Total calculation
  - Validation with Zod
- **Acceptance Criteria**:
  - [ ] Form validates correctly
  - [ ] Date picker prevents same-day selection
  - [ ] Total auto-calculates
- **Validation Command**: Visual verification in browser
- **Estimated Time**: 90 minutes

#### Step 3.3: Create Order Item Editor Component
- **Action**: Modal for editing order items
- **Files**: `packages/app/app/components/orders/order-item-modal.tsx` (new)
- **Details**:
  - Product/variant selection (reuse VariantSelector)
  - Quantity input
  - Unit price display (from quoted price)
  - Save/Cancel actions
  - Track if modified from original
- **Acceptance Criteria**:
  - [ ] Modal opens/closes correctly
  - [ ] Product selection works
  - [ ] Quantity validation
- **Validation Command**: Visual verification in browser
- **Dependencies**: Step 2.4
- **Estimated Time**: 60 minutes

#### Step 3.4: Create Orders List Page
- **Action**: Build main orders listing route
- **Files**: `packages/app/app/routes/_protected.pedidos._index.tsx` (new)
- **Details**:
  - Header with title and sync status
  - Filter by delivery date (default = today and future)
  - Filter by status tabs (Todos, Borradores, Confirmados, Entregados)
  - Search by customer name
  - List of OrderCard components
  - FAB to create new order
  - Group by delivery date
- **Acceptance Criteria**:
  - [ ] Page loads orders
  - [ ] Filters work correctly
  - [ ] Navigation to create/detail works
- **Validation Command**: `bun run dev` and navigate to /pedidos
- **Dependencies**: Step 3.1
- **Estimated Time**: 90 minutes

#### Step 3.5: Create New Order Page
- **Action**: Build order creation route
- **Files**: `packages/app/app/routes/_protected.pedidos.nuevo.tsx` (new)
- **Details**:
  - Reuse OrderForm component
  - Initialize with draft status
  - Save creates order
  - Cancel returns to list
  - Success navigates to order detail
- **Acceptance Criteria**:
  - [ ] Can create order
  - [ ] Offline creation works
  - [ ] Success navigation works
- **Validation Command**: Test creating order in browser
- **Dependencies**: Step 3.2
- **Estimated Time**: 60 minutes

#### Step 3.6: Create Order Detail Page
- **Action**: Build order view/edit route
- **Files**: `packages/app/app/routes/_protected.pedidos.$id._index.tsx` (new)
- **Details**:
  - Display order details
  - Show item list with modification indicators
  - Show audit history (events)
  - Actions based on status:
    - Draft: Edit, Confirm, Cancel
    - Confirmed: Edit items, Cancel, Deliver (if delivery date is today)
    - Cancelled/Delivered: View only
  - Deliver action opens confirmation modal then converts to sale
- **Acceptance Criteria**:
  - [ ] Detail displays correctly
  - [ ] Actions shown based on status
  - [ ] Deliver action converts to sale
  - [ ] Navigation to created sale works
- **Validation Command**: Test full flow in browser
- **Dependencies**: Step 3.3, Step 3.5
- **Estimated Time**: 120 minutes

#### Step 3.7: Update Navigation
- **Action**: Add orders to bottom navigation
- **Files**: `packages/app/app/components/layout/app-layout.tsx`
- **Details**:
  - Add "Pedidos" tab to bottom nav
  - Use ClipboardList icon from lucide-react
  - Update `menuItems` array explicitly: insert `Pedidos` immediately after `Ventas` (before `Cobros`)
- **Acceptance Criteria**:
  - [ ] Tab visible in navigation
  - [ ] Active state works
  - [ ] Navigation works
- **Validation Command**: Visual verification
- **Estimated Time**: 15 minutes

### Phase 4: Testing & Polish [Estimated: 2 days]
**Goal**: Ensure quality, test offline sync, fix bugs
**Prerequisites**: Phase 3 complete
**Definition of Done**: All acceptance criteria met, tests passing

#### Step 4.1: Backend Unit Tests
- **Action**: Test service and repository methods
- **Files**: `packages/backend/src/services/business/__tests__/order.service.test.ts` (new)
- **Details**:
  - Test state transitions
  - Test validation rules
  - Test optimistic locking
  - Test conversion to sale
  - Use Vitest, follow existing test patterns
- **Acceptance Criteria**:
  - [ ] All service methods have tests
  - [ ] Tests pass
  - [ ] Coverage > 80%
- **Validation Command**: `cd packages/backend && bun run test`
- **Estimated Time**: 120 minutes

#### Step 4.2: Integration Tests
- **Action**: Test API endpoints
- **Files**: `packages/backend/src/api/__tests__/orders.test.ts` (new)
- **Details**:
  - Test all endpoints
  - Test validation errors
  - Test authentication/authorization
  - Test idempotency
- **Acceptance Criteria**:
  - [ ] All endpoints tested
  - [ ] Tests pass
- **Validation Command**: `cd packages/backend && bun run test`
- **Estimated Time**: 90 minutes

#### Step 4.3: Offline Sync Testing
- **Action**: Manually test offline scenarios
- **Files**: N/A (manual testing)
- **Details**:
  - Create order offline
  - Modify order offline
  - Come online and verify sync
  - Test conflict resolution
  - Verify data integrity
- **Acceptance Criteria**:
  - [ ] Orders created offline sync when online
  - [ ] Modifications sync correctly
  - [ ] No data loss
- **Validation Command**: Manual testing in browser with network throttling
- **Estimated Time**: 60 minutes

#### Step 4.4: UI Polish
- **Action**: Fix visual issues, add loading states
- **Files**: Various frontend files
- **Details**:
  - Add loading skeletons
  - Add empty states
  - Add error handling UI
  - Ensure mobile responsiveness
  - Verify dark mode (if applicable)
- **Acceptance Criteria**:
  - [ ] No visual glitches
  - [ ] Loading states present
  - [ ] Error handling user-friendly
- **Validation Command**: Visual testing on mobile and desktop
- **Estimated Time**: 90 minutes

#### Step 4.5: End-to-End Testing
- **Action**: Test complete user flows
- **Files**: N/A (manual testing)
- **Details**:
  - Flow 1: Create order → Confirm → Deliver → Verify sale created
  - Flow 2: Create order → Modify items → Confirm → Deliver
  - Flow 3: Create order → Cancel
  - Flow 4: Create offline → Sync → Deliver
- **Acceptance Criteria**:
  - [ ] All flows work correctly
  - [ ] Data consistent across flows
- **Validation Command**: Manual testing
- **Estimated Time**: 60 minutes

---

## 4. Implementation Details

### Decisions Made
| Decision | Rationale | Impact |
|----------|-----------|--------|
| Separate orders table (not status on sales) | Orders have different lifecycle and invariants than sales | Cleaner separation, easier audit trail |
| Optimistic locking with version field | Prevent conflicts in multi-user scenarios | Users get clear conflict errors instead of silent overwrites |
| Snapshot fields (confirmedSnapshot, deliveredSnapshot) | Track what was agreed vs what was delivered | Audit trail for disputes |
| One order = one sale (no partial) | Simpler MVP, covers 80% of use cases | Can extend later if needed |
| Lock prices at confirmation | Customer expects quoted price, protects from overnight changes | Business rule enforcement |
| Minimum 1-day advance | Business requirement | Validation in createOrder |

### Patterns to Follow
```typescript
// Repository pattern - RequestContext as first parameter
class OrderRepository {
  async findById(ctx: RequestContext, id: string) {
    return db.query.orders.findFirst({
      where: and(
        eq(orders.id, id),
        eq(orders.businessId, ctx.businessId) // Multi-tenancy filter
      ),
      with: { items: true }
    });
  }
}

// Service pattern - Business logic + transactions
class OrderService {
  async confirmOrder(ctx: RequestContext, id: string, baseVersion: number) {
    return db.transaction(async (tx) => {
      const order = await this.repository.findById(ctx, id);
      
      // Validation
      if (!order) throw new NotFoundError("Order");
      if (order.version !== baseVersion) throw new ConflictError("Order was modified");
      if (order.status !== "draft") throw new ValidationError("Only draft orders can be confirmed");
      
      // Business logic
      const snapshot = this.createSnapshot(order);
      
      // Update
      await this.repository.update(ctx, id, {
        status: "confirmed",
        confirmedSnapshot: snapshot,
        version: order.version + 1
      }, tx);
      
      // Audit
      await this.eventsRepo.create(ctx, { orderId: id, eventType: "confirmed" }, tx);
    });
  }
}

// Frontend hook pattern - Offline support
export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      if (!isOnline()) {
        const tempId = createSyncId();
        await syncClient.enqueueOperation({
          entity: "orders",
          operation: "insert",
          entityId: tempId,
          data: { ...input, tempId }
        });
        return { id: tempId, ...input, syncStatus: "pending" };
      }
      
      const { data, error } = await api.orders.post(input);
      if (error) throw new Error(String(error.value));
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });
}
```

---

## 5. Verification & Quality Gates

### Pre-Implementation Checklist
- [ ] All prerequisite files exist and are readable
- [ ] No conflicting migrations in progress
- [ ] Database connection working
- [ ] Backend and frontend dev servers run

### Per-Phase Verification
**Phase 1**:
- Run: `cd packages/backend && bun run typecheck`
- Expected: No TypeScript errors
- Run: `cd packages/backend && bun run db:migrate`
- Expected: Migration applies successfully
- Run: `cd packages/backend && bun run test`
- Expected: All new tests pass

**Phase 2**:
- Run: `cd packages/app && bun run typecheck`
- Expected: No TypeScript errors
- Run: `cd packages/shared && bun run build`
- Expected: Shared builds successfully

**Phase 3**:
- Run: `bun run dev`
- Expected: Both servers start, no errors
- Navigate to: http://localhost:5173/pedidos
- Expected: Orders list page loads

**Phase 4**:
- Run: `cd packages/backend && bun run test --coverage`
- Expected: Coverage > 80%
- Manual test: Full user flows

### Final Acceptance Criteria
- [ ] Can create order with delivery date >= tomorrow
- [ ] Can modify order items before confirmation
- [ ] Prices lock at confirmation
- [ ] Can confirm order
- [ ] Can cancel order
- [ ] Can convert confirmed order to sale on delivery date
- [ ] Offline creation works and syncs when online
- [ ] Offline modifications sync correctly
- [ ] Conflict detection works (optimistic locking)
- [ ] Audit trail shows all changes
- [ ] Mobile UI is responsive
- [ ] All existing sales functionality still works

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing sync logic | Low | High | Keep sync pattern identical to sales, thorough testing |
| Performance issues with large order lists | Medium | Medium | Add proper indexes, pagination, virtual scrolling if needed |
| Mobile UI issues | Medium | Medium | Test on actual mobile devices, follow existing responsive patterns |
| Data inconsistency in offline scenarios | Medium | High | Extensive offline testing, idempotency on all operations |
| User confusion between orders and sales | Medium | Low | Clear UI labels, different color schemes, onboarding tooltips |

---

## 7. Ready-to-Execute Commands

### Option A: Execute Full Plan
```bash
# Start from Phase 1
/build Execute full plan from @docs/implement-orders-system-pedidos.md starting Phase 1
```

### Option B: Execute by Phase
```bash
# Execute only Phase 1 (Backend)
/build Execute Phase 1 only from @docs/implement-orders-system-pedidos.md

# Execute Phase 2 (Frontend Hooks)
/build Execute Phase 2 only from @docs/implement-orders-system-pedidos.md

# Execute Phase 3 (Frontend UI)
/build Execute Phase 3 only from @docs/implement-orders-system-pedidos.md

# Execute Phase 4 (Testing)
/build Execute Phase 4 only from @docs/implement-orders-system-pedidos.md
```

### Option C: Execute Single Step
```bash
# Execute specific step
/build Execute Step 1.1 from @docs/implement-orders-system-pedidos.md
/build Execute Step 1.7 from @docs/implement-orders-system-pedidos.md
/build Execute Step 3.4 from @docs/implement-orders-system-pedidos.md
```

---

## 8. Continuation Context

### If Interrupted, Resume Here:
**Current Phase**: Not started  
**Current Step**: None  
**What's Done**: Analysis complete, plan documented  
**What's Next**: Start Phase 1, Step 1.1 (Create Order Status Enum)

### Key Information for Next Agent:
- **Critical**: Follow existing patterns EXACTLY - use sales system as reference
- **Database**: All new tables must have syncStatus and syncAttempts fields
- **Backend**: RequestContext is ALWAYS first parameter to repository/service methods
- **Frontend**: Use createModal pattern for modals, TanStack Query for data, syncClient for offline
- **Validation**: Date must be >= tomorrow for new orders
- **Conversion**: One order = one sale, use sales.order_id FK to link
- **Testing**: Test offline scenarios thoroughly - this is an offline-first app

### Files to Reference for Patterns:
- Backend Repository: `packages/backend/src/services/repository/sale.repository.ts`
- Backend Service: `packages/backend/src/services/business/sale.service.ts`
- Backend API: `packages/backend/src/api/sales.ts`
- Frontend Hook: `packages/app/app/hooks/use-sales.ts`
- Frontend List: `packages/app/app/routes/_protected.ventas._index.tsx`
- Frontend Create: `packages/app/app/routes/_protected.ventas.nueva.tsx`

---

Document generated: 2025-02-21  
Generated by: Sisyphus (Claude Code)  
Context: Feature analysis complete, ready for implementation

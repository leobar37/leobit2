# Requirements: E2E Sales & Orders Testing

## Functional Requirements

### FR-001: Cash Sale Testing
The system must support testing cash sales with:
- Single product sales
- Multiple product sales (5+ items)
- Weight-based products (tara/peso)
- Unit-based products (packs)
- Discounts applied

### FR-002: Credit Sale Testing
The system must support testing credit sales with:
- No initial payment (debe todo)
- Partial payment (a cuenta)
- Full payment at creation (pago total)
- Validation requiring customer selection
- Debt tracking and verification

### FR-003: Sale Validations
The system must validate and test error scenarios:
- Sale without products
- Total equal to zero
- Total mismatch with item sum
- Credit without customer
- Cash with incorrect payment amount
- Credit with overpayment
- Product without variant
- Quantity exceeding stock

### FR-004: Sale Item Management
The system must support testing item operations:
- Add items to cart
- Update item quantities
- Update item prices
- Remove items from cart
- Handle empty cart scenarios
- Same product with different variants

### FR-005: Sale Cancellation
The system must support testing cancellations:
- Cancel cash sales
- Cancel credit sales
- Cancel with cash refund
- Cancel with digital refund (Yape/Plin)
- Cancel with balance refund
- Cancel without refund

### FR-006: Sale Updates
The system must support testing sale modifications:
- Change customer
- Change sale type (cash/credit)
- Change payment mode
- Update amounts
- Prevent editing delivered sales

### FR-007: Public Sale Tokens
The system must support testing public tokens:
- Generate token for sale
- Regenerate existing token
- Activate/deactivate token
- Access sale via public token

### FR-008: Sale Listings
The system must support testing listings:
- Paginated sales list
- Filter by date range
- Filter by sale type
- View sale details
- View sale items
- Dashboard statistics

### FR-009: Order Creation
The system must support testing order creation:
- Credit order with future date
- Credit order with today's date
- Cash order with advance payment
- Multiple product orders
- Orders with quoted prices
- Orders with proof of advance payment

### FR-010: Order Validations
The system must validate orders:
- Reject past delivery dates
- Reject invalid dates
- Require customer selection

### FR-011: Order Lifecycle
The system must support testing order states:
- Confirm draft order
- Confirm with version check
- Prevent double confirmation
- Deliver confirmed order
- Deliver with quantity adjustments
- Deliver with price adjustments
- Partial delivery
- Cancel draft order
- Cancel confirmed order
- Prevent canceling delivered order

### FR-012: Order Item Management
The system must support testing order items:
- Add items to order
- Modify ordered quantity
- Modify quoted price
- Mark items as modified
- Remove items from order

### FR-013: Order Versioning
The system must support testing versioning:
- Snapshot on confirmation
- Snapshot on delivery
- Version increment on changes

### FR-014: Order Permissions
The system must support testing permissions:
- Allow customer editing
- Block customer editing

### FR-015: Volume Testing
The system must support volume scenarios:
- Generate 1000 mock customers
- Generate 100 mock products
- Generate 500 mock sales
- Generate 200 mock orders
- Handle 1000+ sync operations

### FR-016: Performance Testing
The system must meet performance benchmarks:
- Load 1000 records in < 3s
- Search in 1000 records in < 1s
- Create sale in < 2s with volume data
- Scroll infinite list smoothly

### FR-017: Sync Testing
The system must support testing sync:
- Process 1000 pending operations
- Handle sync conflicts
- Verify IndexedDB persistence
- Retry failed operations
- Resolve conflicts offline
- Background sync behavior

### FR-018: E2E Integration Flows
The system must support complete flows:
- Login → Cash sale → Verification
- Login → Credit sale → Payment → Verification
- Order → Confirm → Deliver → Sale
- Visit → Order → Sale
- Distribution → Multiple sales

## Non-Functional Requirements

### NFR-001: Test Isolation
Each test must be independent with isolated MSW data store.

### NFR-002: Mobile Viewport
All tests must run in mobile viewport (390x844).

### NFR-003: Execution Time
- Smoke tests: < 10 minutes
- Full suite: < 30 minutes
- Volume tests: < 15 minutes

### NFR-004: Maintainability
- Page objects must be reusable
- Test data builders must be fluent
- Patterns must be documented

## Test Case Count

| Category | Count |
|----------|-------|
| Cash Sales | 5 |
| Credit Sales | 5 |
| Distribution Sales | 2 |
| Visit Sales | 2 |
| Draft Sales | 3 |
| Sale Validations | 8 |
| Item Management | 6 |
| Cancellations | 6 |
| Updates | 5 |
| Tokens | 4 |
| Listings | 6 |
| Order Creation | 8 |
| Order Validations | 3 |
| Order Lifecycle | 10 |
| Order Items | 5 |
| Order Versioning | 3 |
| Order Permissions | 2 |
| Volume | 12 |
| Sync | 6 |
| E2E Flows | 8 |
| **Total** | **109** |

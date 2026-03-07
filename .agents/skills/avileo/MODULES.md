# Avileo Business Modules

> Functional modules, workflows, and business logic for the chicken sales management system.

## Table of Contents

1. [Module Overview](#module-overview)
2. [Authentication (M1)](#authentication-m1)
3. [Users & Roles (M2)](#users--roles-m2)
4. [Calculator (M4)](#calculator-m4)
5. [Sales (M5)](#sales-m5)
6. [Customers & Abonos (M6)](#customers--abonos-m6)
7. [Distribution (M3)](#distribution-m3)
8. [Inventory (M7)](#inventory-m7)
9. [Sync Engine (M8)](#sync-engine-m8)
10. [System Configuration](#system-configuration)

---

## Module Overview

### Module Priority Matrix

| ID | Module | Priority | Description | Offline Support |
|----|--------|----------|-------------|-----------------|
| M1 | Authentication | CORE | Login, logout, JWT | ⚠️ First login needs internet |
| M2 | Users & Roles | CORE | CRUD users, permissions | ❌ Admin only |
| M3 | Distribution | CONFIGURABLE | Assign inventory to vendors | ✅ 100% offline |
| M4 | Calculator | CORE | Price calculations with tare | ✅ 100% offline |
| M5 | Sales | CORE | Cash and credit sales | ✅ 100% offline |
| M6 | Customers & Abonos | CORE | Accounts receivable, payments | ✅ 100% offline |
| M7 | Inventory | CONFIGURABLE | Stock control | ✅ 100% offline |
| M8 | Sync Engine | CORE | Offline/online sync | ✅ Background sync |
| M9 | Catalog | V2 | Products for orders | Planned |
| M10 | Orders | V2 | Online ordering | Planned |
| M11 | Reports | V2 | Statistics | Planned |
| M12 | Collection | FUTURE | Supplier purchases | Future |

### Operation Mode Impact

| Mode | Distribution | Stock Control | Sales Validation |
|------|--------------|---------------|------------------|
| **Inventario Propio** | ✅ Active | ✅ Yes | ✅ Stock check |
| **Sin Inventario** | ❌ Hidden | ❌ No | ❌ No validation |
| **Pedidos** | ❌ Hidden | ⚠️ Orders | ✅ Against order |
| **Mixto** | ✅ Configurable | ✅ Configurable | ✅ Configurable |

---

## Authentication (M1)

### Purpose
Login, logout, and secure session management.

### Features

- [x] Login with username/password
- [x] Logout
- [x] JWT Token with expiration
- [ ] Password recovery (Future)

### Inputs & Outputs

**Login:**
- Inputs: `username`, `password`
- Outputs: `jwt_token`, `user_data`, `session_id`

### Offline Behavior

**First Login:**
- Requires internet connection
- Validates credentials with server
- Receives JWT token
- Caches token locally (IndexedDB)

**Subsequent Access:**
- Reads JWT from local cache
- Validates locally (expiration check)
- Works completely offline
- Silent refresh when online

### Flow

```
FIRST LOGIN (Internet Required)

1. User enters credentials
2. POST /api/auth/login
3. Better Auth validates
4. Returns JWT + user data
5. Store in IndexedDB
6. Redirect to dashboard

SUBSEQUENT ACCESS (Offline OK)

1. App starts
2. Check IndexedDB for token
3. Validate expiration
4. If valid → Allow access
5. If expired → Redirect to login
```

---

## Users & Roles (M2)

### Purpose
User CRUD and role-based permission control. **Only ADMIN can create users.**

### Roles

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full system access (create users, view reports, configure) |
| **VENDEDOR** | Sales, Customers, Calculator, Catalog, History (own data only) |

### User Data

| Field | Required | Description |
|-------|----------|-------------|
| Full name | Yes | Vendor/Admin name |
| DNI | Yes | ID document |
| Email | Yes | For credentials email |
| Phone | No | Contact |
| Role | Yes | ADMIN or VENDEDOR |
| Sales point | No | Carro A, Casa, etc. |
| Commission | No | Commission % per sale |
| Status | Yes | Active/Inactive |

### User Creation Flow

```
ADMIN CREATES USER

1. Admin accesses "User Management"
2. Click "New User"
3. Fill data: name, DNI, email, phone
4. Select role: Vendedor or Admin
5. Configure sales point (if vendor)
6. System generates automatic password
7. Send email with credentials
8. User changes password on first login
```

### Multi-Tenancy

Users can belong to multiple businesses via `business_users` table:

```
User A
├── Business 1 (Role: ADMIN)
├── Business 2 (Role: VENDEDOR, Sales point: Carro A)
└── Business 3 (Role: VENDEDOR, Sales point: Casa)
```

---

## Calculator (M4)

### Purpose
Intelligent chicken price calculations with tare subtraction.

### Formula

```
Net Kilos = Gross Kilos - Tare

Calculate any 2 values, get the 3rd:
- Know: Total Amount + Price/kg → Calculate Kilos
- Know: Total Amount + Kilos → Calculate Price/kg  
- Know: Price/kg + Kilos → Calculate Total Amount
```

### Use Cases

**Scenario 1: Calculate Kilos**
```
Customer pays: S/ 150
Price per kg: S/ 15
Tare: 0.5 kg

Net Kilos = (150 / 15) - 0.5 = 9.5 kg
```

**Scenario 2: Calculate Price/kg**
```
Customer pays: S/ 200
Gross Kilos: 12 kg
Tare: 0.5 kg

Net Kilos = 12 - 0.5 = 11.5 kg
Price/kg = 200 / 11.5 = S/ 17.39
```

**Scenario 3: Calculate Total**
```
Gross Kilos: 15 kg
Tare: 0.5 kg
Price per kg: S/ 16

Net Kilos = 15 - 0.5 = 14.5 kg
Total = 14.5 × 16 = S/ 232
```

### UI Behavior

- Input any 2 fields, 3rd calculates automatically
- Configurable price per kg (per business)
- Tare saved per vendor preference
- Works 100% offline

---

## Sales (M5)

### Purpose
Register cash and credit sales. Works **100% offline**.

### Sale Types

| Type | Description | Payment |
|------|-------------|---------|
| **Contado** | Cash sale | Full payment at sale |
| **Crédito** | Credit sale | Partial or no payment, tracked as debt |

### Features

- [x] Cash sales
- [x] Credit sales
- [x] **Sales without customer** (generic customer)
- [x] Multiple products per sale
- [x] Local save when offline
- [x] Automatic sync when online

### Sale Without Customer

**Use Cases:**
- Quick sales
- Occasional customers
- Customers who don't want to register

**Implementation:**
- `client_id` = NULL
- Reports show as "Generic Customer" or "No name"
- Still tracked in sales totals

### Offline Flow

```
VENDOR REGISTERS SALE (No Internet)

1. Complete sale form
2. Select customer (optional)
3. Add products
4. Calculate total
5. Click "Register"
        ↓
6. TanStack DB saves to memory
7. IndexedDB persists locally
8. SyncEngine detects: NO internet
9. Add to pending queue
10. Show: "✅ Sale saved. Will sync later."

WHEN INTERNET RETURNS

1. Browser detects 'online'
2. SyncEngine.processQueue()
3. POST /api/sales
4. Server confirms
5. Update status to 'synced'
6. UI shows: "🟢 Synchronized"
```

### Sale Data Structure

```typescript
interface Sale {
  id: UUID;                    // Local ID (synced to server)
  business_id: UUID;           // Current business
  client_id: UUID | null;      // Optional customer
  seller_id: UUID;             // Vendor (business_users.id)
  distribucion_id: UUID | null; // Optional distribution
  sale_type: 'contado' | 'credito';
  total_amount: Decimal;       // Total sale
  amount_paid: Decimal;        // Amount paid now
  balance_due: Decimal;        // Outstanding balance
  tara: Decimal;               // Tare in kg
  net_weight: Decimal;         // Net weight
  sync_status: 'pending' | 'synced' | 'error';
  sync_attempts: number;
  sale_date: Timestamp;
  items: SaleItem[];
}

interface SaleItem {
  product_id: UUID;
  product_name: string;        // Denormalized
  quantity: Decimal;
  unit_price: Decimal;
  subtotal: Decimal;
}
```

---

## Customers & Abonos (M6)

### Purpose
Accounts receivable management and debt payments. Works **100% offline**.

### Customer Features

- [x] CRUD Customers (create, read, update)
- [x] Purchase history
- [x] Outstanding balance calculation
- [x] Search cached customers

### Customer Data

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Customer name |
| DNI | No | ID document |
| Phone | No | Contact phone |
| Address | No | Delivery address |
| Notes | No | Additional info |

### Abonos (Debt Payments)

**Purpose:** Register payments that customers make on their debt, **independent of a sale**.

**Use Cases:**
1. Customer comes ONLY to pay debt (no purchase)
2. Partial debt payment
3. Full debt settlement

**Payment Methods:**
- Efectivo (Cash)
- Yape (App)
- Plin (App)
- Transferencia (Bank transfer)

### Debt Calculation

```
Outstanding Balance = SUM(credit sales) - SUM(abonos)
```

**Example:**
```
Customer: Juan Pérez

Sales (Crédito):
├── Sale #1: S/ 150 (pending)
├── Sale #2: S/ 200 (pending)
└── Total Debt: S/ 350

Abonos:
├── Payment #1: S/ 50
├── Payment #2: S/ 100
└── Total Paid: S/ 150

Outstanding Balance: S/ 350 - S/ 150 = S/ 200
```

### Abono Flow (No Purchase)

```
CUSTOMER COMES TO PAY

1. Vendor searches customer
2. Sees current debt (S/ 200)
3. Enters payment amount (S/ 100)
4. Selects payment method
5. System calculates: 200 - 100 = S/ 100 new debt
6. Saves locally (offline)
7. Prints receipt
8. Customer receives proof

WHEN ONLINE

1. Sync abono to server
2. Update customer balance
3. Confirm sync status
```

---

## Distribution (M3)

### Purpose
Daily inventory assignment to vendors. **Optional module** based on operation mode.

### When to Use

✅ **Use when:**
- You have own inventory
- Want to control how much each vendor gets
- Want to track vendor performance vs assignment

❌ **Don't use when:**
- Commission-based sales
- No stock control needed

### Concept

A vendor can sell from:
- **Carro** (street cart)
- **Casa** (home delivery)
- **Local** (fixed store)
- Any defined **sales point**

### Distribution Data

| Field | Description |
|-------|-------------|
| Vendor | Assigned vendor (business_users.id) |
| Sales Point | Carro A, Casa, etc. |
| Kilos Assigned | Kilos given to vendor |
| Kilos Sold | Kilos actually sold (auto-calculated) |
| Amount Collected | Money collected (auto-calculated) |
| Date | Distribution date |
| Status | activo, cerrado, en_ruta |

### Example with Distribution

```
Morning: 150 kg of chicken arrives

Distribution:
├── Dist #1: Juan P. → Carro A → 50 kg
├── Dist #2: Pedro R. → Casa → 40 kg
└── Dist #3: María G. → Local Centro → 60 kg

End of Day:
├── Juan sold: 45 kg → 5 kg remaining
├── Pedro sold: 40 kg → 0 kg remaining
└── María sold: 55 kg → 5 kg (over-assigned)
```

### Example without Distribution

```
Vendors sell freely, system only records:
├── Juan sold: 30 kg → Recorded
├── María sold: 45 kg → Recorded
└── (No control of assigned amounts)
```

### Sale Without Distribution

Even in "Inventario Propio" mode:

```typescript
// Config: permitir_venta_sin_stock = true

Vendor can:
- Register sales without assigned kilos
- System only saves sale (doesn't deduct from stock)
- Useful for: occasional sales, special days, emergencies
```

### Performance Tracking

```
Vendor Performance = (Kilos Sold / Kilos Assigned) × 100

Juan: 45/50 = 90%
Pedro: 40/40 = 100%
María: 55/60 = 92%
```

---

## Inventory (M7)

### Purpose
Stock control for products. **Optional** based on operation mode.

### Products

**Types:**
- Pollo (Chicken)
- Huevo (Eggs)
- Otro (Other)

**Units:**
- kg (Kilograms)
- unidad (Units/pieces)

### Inventory Tracking

| Product | Current Stock | Unit |
|---------|--------------|------|
| Pollo vivo | 500 | kg |
| Pollo pelado | 200 | kg |
| Alas | 50 | kg |
| Piernas | 75 | kg |
| Huevos | 500 | unidad |

### Features

- [x] Stock by product
- [ ] Low stock alerts (Future)
- [x] Automatic deduction on sales (if distribution enabled)

### Stock Flow (with Distribution)

```
1. Receive chicken from supplier
   └── Add to inventory

2. Create distribution
   └── Deduct from inventory
   └── Assign to vendor

3. Vendor makes sales
   └── Deduct from distribution
   └── Track actual sales

4. End of day
   └── Return unsold to inventory (optional)
   └── Or count as loss
```

---

## Sync Engine (M8)

### Purpose
Motor de sincronización offline/online.

### Features

- [x] Detect connection status
- [x] Queue operations when offline
- [x] Retry with exponential backoff
- [x] Resolve simple conflicts
- [x] Show sync status in UI
- [x] Persist queue in IndexedDB

### Sync Status Indicators

```
🟢 Online - Everything synchronized
🟡 3 operations pending - Will auto-sync
🔴 Offline - Working offline, data safe
⚠️ Sync error - Tap to retry
```

### Retry Strategy

```
Attempt 1: Immediate
Attempt 2: After 2 seconds
Attempt 3: After 4 seconds
Attempt 4: After 8 seconds
Maximum: 3-5 attempts, then mark as error
```

### Conflict Resolution

**Strategy:** "Last write wins"

**Example:**
```
Vendor A edits Customer X at 10:00 (offline)
Vendor B edits Customer X at 10:05 (offline)

Both sync at 11:00:
1. Vendor A's edit applies
2. Vendor B's edit applies (overwrites A)
3. System shows: "Updated by another user"
```

### Sync Queue Structure

```typescript
interface SyncQueueItem {
  id: UUID;
  operation_type: 'create' | 'update' | 'delete';
  collection: 'ventas' | 'clientes' | 'abonos' | 'distribuciones';
  data: object;
  created_at: Timestamp;
  attempts: number;
  last_error?: string;
}
```

### Connection Detection

```typescript
// Browser events
window.addEventListener('online', () => {
  syncEngine.processQueue();
});

window.addEventListener('offline', () => {
  syncEngine.pause();
});
```

---

## System Configuration

### Configuration Options

| Setting | Values | Description |
|---------|--------|-------------|
| `modo_operacion` | inventario_propio, sin_inventario, pedidos, mixto | Operation mode |
| `control_kilos` | true/false | Track stock |
| `usar_distribucion` | true/false | Use daily distribution |
| `permitir_venta_sin_stock` | true/false | Allow sales without assigned stock |

### Mode Impact on UI

| Mode | Vendor Dashboard | New Sale | Distribution |
|------|-----------------|----------|--------------|
| **Inventario Propio** | Shows assigned kilos | Validates stock | ✅ Active |
| **Sin Inventario** | Shows sales summary only | No stock validation | ❌ Hidden |
| **Pedidos** | Pending orders | Against registered order | ❌ Hidden |

### Configuration UI

**Admin Panel:**
```
⚙️ System Configuration

Operation Mode: [Inventario Propio ▼]
├── Control Kilos: [✓]
├── Use Distribution: [✓]
└── Allow Sale Without Stock: [✓]

[Save Configuration]
```

---

## Daily Workflow Examples

### Scenario 1: Traditional with Distribution

```
05:00 AM - Receive 150 kg chicken
         - Weigh and prepare

06:00 AM - Create distributions
         ├── Juan: Carro A - 50 kg
         ├── Pedro: Casa - 40 kg
         └── María: Local - 60 kg

09:00 AM - Vendors start selling (offline)
         - Each sale saved locally

02:00 PM - Juan connects to WiFi
         - Auto-syncs 15 sales

06:00 PM - All vendors sync
         - Admin sees complete data

07:00 PM - Close day
         - Generate reports
         - Review performance
```

### Scenario 2: Commission-Based (No Inventory)

```
08:00 AM - Vendors arrive

09:00 AM - Start selling (comission-based)
         - No distribution needed
         - Just record sales

06:00 PM - Vendors sync sales

07:00 PM - Admin reviews
         - Calculate commissions
         - Generate reports
```

### Scenario 3: Offline for 3 Days

```
Day 1: No internet in area
       ├── 20 sales recorded locally
       └── All data safe

Day 2: Still no internet
       ├── 25 more sales
       └── Queue grows

Day 3: Vendor finds WiFi
       ├── 45 sales sync at once
       └── Server processes batch

Result: No data lost
```

---

## Business Rules Summary

### Sales
- ✅ Can sell without customer
- ✅ Can sell without distribution (if config allows)
- ✅ Credit sales track debt automatically
- ✅ Cash sales complete immediately

### Customers
- ✅ Debt calculated automatically (sales - abonos)
- ✅ Can pay without buying (abono only)
- ✅ Search works offline (cached data)

### Distribution
- ✅ Optional based on mode
- ✅ Tracks vendor performance
- ✅ Can sell more than assigned (over-sale)

### Sync
- ✅ Works offline for days
- ✅ Auto-syncs when online
- ✅ Retry with backoff on error
- ✅ Queue persists across sessions

---

*For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md)*
*For database schema, see [DATABASE.md](DATABASE.md)*

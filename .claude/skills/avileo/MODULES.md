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
9. [Purchases & Suppliers (M7b)](#purchases--suppliers-m7b)
10. [Cierre del Dia (M9)](#cierre-del-dia-m9)
11. [Public Catalog (M10)](#public-catalog-m10)
12. [Payment Methods (M11)](#payment-methods-m11)
13. [WhatsApp Integration (M12)](#whatsapp-integration-m12)
14. [System Configuration](#system-configuration)

---

## Module Overview

### Module Priority Matrix

| ID | Module | Priority | Description |
|----|--------|----------|-------------|
| M1 | Authentication | CORE | Login, logout, JWT |
| M2 | Users & Roles | CORE | CRUD users, permissions |
| M3 | Distribution | CONFIGURABLE | Assign inventory to vendors |
| M4 | Calculator | CORE | Price calculations with tare |
| M5 | Sales | CORE | Cash and credit sales |
| M6 | Customers & Abonos | CORE | Accounts receivable, payments |
| M7 | Inventory | CONFIGURABLE | Stock control |
| M7b | Purchases | CONFIGURABLE | Supplier purchases |
| M9 | Cierre | CORE | Daily closing reports |
| M10 | Public Catalog | V2 | Customer pre-order page |
| M11 | Payment Methods | V2 | Configurable payment methods |
| M12 | WhatsApp | V2 | Templates and messaging |
| M13 | Reports | V2 | Statistics |

### Operation Mode Impact

| Mode | Distribution | Stock Control | Sales Validation |
|------|--------------|---------------|------------------|
| **Inventario Propio** | Active | Yes | Stock check |
| **Sin Inventario** | Hidden | No | No validation |
| **Pedidos** | Hidden | Orders | Against order |
| **Mixto** | Configurable | Configurable | Configurable |

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

### Flow

```
LOGIN (Internet Required)

1. User enters credentials
2. POST /api/auth/login
3. Better Auth validates
4. Returns JWT + user data
5. Store in localStorage/IndexedDB
6. Redirect to dashboard
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
- Know: Total Amount + Price/kg -> Calculate Kilos
- Know: Total Amount + Kilos -> Calculate Price/kg  
- Know: Price/kg + Kilos -> Calculate Total Amount
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
Total = 14.5 x 16 = S/ 232
```

### UI Behavior

- Input any 2 fields, 3rd calculates automatically
- Configurable price per kg (per business)
- Tare saved per vendor preference

---

## Sales (M5)

### Purpose
Register cash and credit sales.

### Sale Types

| Type | Description | Payment |
|------|-------------|---------|
| **Contado** | Cash sale | Full payment at sale |
| **Credito** | Credit sale | Partial or no payment, tracked as debt |

### Features

- [x] Cash sales
- [x] Credit sales
- [x] **Sales without customer** (generic customer)
- [x] Multiple products per sale
- [x] Sale without distribution (if config allows)

### Sale Without Customer

**Use Cases:**
- Quick sales
- Occasional customers
- Customers who don't want to register

**Implementation:**
- `client_id` = NULL
- Reports show as "Generic Customer" or "No name"
- Still tracked in sales totals

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
Accounts receivable management and debt payments.

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
Customer: Juan Perez

Sales (Credito):
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
6. Saves to server
7. Prints receipt
8. Customer receives proof
```

---

## Distribution (M3)

### Purpose
Daily inventory assignment to vendors. **Optional module** based on operation mode.

### When to Use

**Use when:**
- You have own inventory
- Want to control how much each vendor gets
- Want to track vendor performance vs assignment

**Don't use when:**
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
├── Dist #1: Juan P. -> Carro A -> 50 kg
├── Dist #2: Pedro R. -> Casa -> 40 kg
└── Dist #3: Maria G. -> Local Centro -> 60 kg

End of Day:
├── Juan sold: 45 kg -> 5 kg remaining
├── Pedro sold: 40 kg -> 0 kg remaining
└── Maria sold: 55 kg -> 5 kg (over-assigned)
```

### Example without Distribution

```
Vendors sell freely, system only records:
├── Juan sold: 30 kg -> Recorded
├── Maria sold: 45 kg -> Recorded
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
Vendor Performance = (Kilos Sold / Kilos Assigned) x 100

Juan: 45/50 = 90%
Pedro: 40/40 = 100%
Maria: 55/60 = 92%
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

## Purchases & Suppliers (M7b)

### Purpose
Track inventory purchases from suppliers.

### Suppliers

| Field | Description |
|-------|-------------|
| Name | Supplier name |
| Type | generic, regular, internal |
| RUC | Tax ID |
| Phone | Contact |
| Email | Contact |

### Purchase Status

| Status | Description |
|--------|-------------|
| **draft** | Draft purchase |
| **pending** | Ordered, awaiting delivery |
| **received** | Delivered and processed |
| **cancelled** | Cancelled |

### Purchase Flow

```
1. Create purchase draft
   |-- Select supplier
   |-- Add items (product + variant + quantity + unit cost)

2. Confirm purchase
   |-- Status: pending

3. Receive inventory
   |-- Status: received
   |-- Add to variant inventory

4. Optional: Upload receipt image
```

---

## Cierre del Dia (M9)

### Purpose
Daily closing report by vendor. Summarizes sales, payments, and distribution performance.

### Data Included

- Total sales (cash + credit)
- Total abonos collected
- Distribution performance (assigned vs sold)
- Cash balance

### Flow

```
VENDOR CLOSES DAY

1. Vendor accesses "Cierre"
2. System calculates from server data:
   |-- Total ventas
   |-- Total cobros
   |-- Balance
3. Vendor confirms
4. System marks distribution as "cerrado"
```

---

## Public Catalog (M10)

### Purpose
Customer-facing page for pre-orders. Business enables public catalog and shares link.

### Features

- [x] Public product catalog (no auth required)
- [x] Customer places pre-order
- [x] Business receives order notification
- [x] Token-based access (sale tokens)

### Flow

```
BUSINESS ENABLES CATALOG

1. Admin enables "public_catalog_enabled"
2. Sets "public_catalog_slug" (e.g., "mi-negocio")
3. Shares link: /venta/mi-negocio

CUSTOMER PLACES ORDER

1. Customer visits public catalog
2. Browses products with variants
3. Selects items, enters contact info
4. Submits pre-order
5. Business receives notification
```

---

## Payment Methods (M11)

### Purpose
Configurable payment methods per business. Admin enables/disables methods and configures details.

### Supported Methods

| Method | Configurable Fields |
|--------|---------------------|
| **Efectivo** | enabled |
| **Yape** | enabled, phone, QR image |
| **Plin** | enabled, phone, QR image |
| **Transferencia** | enabled, account number, account name, bank, CCI |
| **Tarjeta** | enabled |

### Configuration

```typescript
interface PaymentMethodConfig {
  enabled: boolean;
  phone?: string;
  accountNumber?: string;
  accountName?: string;
  bank?: string;
  cci?: string;
  qrImageUrl?: string;
}
```

---

## WhatsApp Integration (M12)

### Purpose
Send notifications and messages to customers via WhatsApp.

### Features

- [x] Message templates (cobranza, ventas, agradecimiento, entrega)
- [x] Per-user WhatsApp settings
- [x] Message history tracking

### Templates

| Category | Use Case |
|----------|----------|
| **cobranza** | Payment reminders |
| **ventas** | Sale confirmations |
| **agradecimiento** | Thank you messages |
| **entrega** | Delivery notifications |
| **otros** | Custom messages |

---

## System Configuration

### Configuration Options

| Setting | Values | Description |
|---------|--------|-------------|
| `modo_operacion` | inventario_propio, sin_inventario, pedidos, mixto | Operation mode |
| `control_kilos` | true/false | Track stock |
| `usar_distribucion` | true/false | Use daily distribution |
| `permitir_venta_sin_stock` | true/false | Allow sales without assigned stock |
| `public_catalog_enabled` | true/false | Enable public customer catalog |
| `public_catalog_slug` | string | URL slug for public catalog |

### Mode Impact on UI

| Mode | Vendor Dashboard | New Sale | Distribution | Public Catalog |
|------|-----------------|----------|--------------|----------------|
| **Inventario Propio** | Shows assigned kilos | Validates stock | Active | Optional |
| **Sin Inventario** | Shows sales summary only | No stock validation | Hidden | Optional |
| **Pedidos** | Pending orders | Against registered order | Hidden | Active |
| **Mixto** | Configurable | Configurable | Configurable | Optional |

---

## Daily Workflow Examples

### Scenario 1: Traditional with Distribution

```
05:00 AM - Receive 150 kg chicken
         - Weigh and prepare

06:00 AM - Create distributions
         |-- Juan: Carro A - 50 kg
         |-- Pedro: Casa - 40 kg
         |-- Maria: Local - 60 kg

09:00 AM - Vendors start selling
         - Each sale recorded via API

02:00 PM - Admin sees live data
         - All sales visible in dashboard

06:00 PM - All vendors finish
         - Admin sees complete data

07:00 PM - Close day
         - Generate reports
         - Review performance
```

### Scenario 2: Commission-Based (No Inventory)

```
08:00 AM - Vendors arrive

09:00 AM - Start selling (commission-based)
         - No distribution needed
         - Just record sales

06:00 PM - Admin reviews
         - Calculate commissions
         - Generate reports
```

---

## Business Rules Summary

### Sales
- Can sell without customer
- Can sell without distribution (if config allows)
- Credit sales track debt automatically
- Cash sales complete immediately

### Customers
- Debt calculated automatically (sales - abonos)
- Can pay without buying (abono only)
- Search works via API

### Distribution
- Optional based on mode
- Tracks vendor performance
- Can sell more than assigned (over-sale)

---

*For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md)*
*For database schema, see [DATABASE.md](DATABASE.md)*

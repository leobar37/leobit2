# Avileo - Progress Tracker

> Offline-first chicken sales management system
> Last updated: Feb 19, 2026

---

## Executive Summary

**Status:** Production Ready (MVP Complete + Advanced Features)  
**Total Modules:** 12 implemented  
**Backend APIs:** 80+ endpoints  
**Database Tables:** 27 tables  
**Frontend Routes:** 39 pages  

---

## Core Modules (MVP) ✅

### Module 1: Authentication & Team Management
**Status:** ✅ Complete  
**Date:** Feb 11, 2026

#### Backend
- **Better Auth Integration** - Full setup with Drizzle ORM + PostgreSQL
- **Authentication API** - `/auth/*` endpoints (login, register, logout, session)
- **Protected Middleware** - `requireAuth` guards for private routes
- **JWT Sessions** - 7-day expiration, secure cookies
- **Team Invitations** - Complete invitation flow (create, cancel, accept)
  - `POST /invitations` - Create invitation
  - `GET /invitations` - List invitations
  - `POST /invitations/:id/cancel` - Cancel invitation
  - `GET /public/invitations/:token` - Validate invitation
  - `POST /public/invitations/accept` - Accept invitation
- **Business Members Management**
  - `GET /businesses/me/members` - List team members
  - `PUT /businesses/me/members/:id` - Update member role/point
  - `DELETE /businesses/me/members/:id` - Deactivate member

#### Frontend
- **Auth Pages** - Login (`/login`) and Register (`/register`)
- **Invitation Flow** - Accept invitation page (`/invitations/:token`)
- **Team Management** - Team page (`/team`) and invitations (`/invitations`)
- **Protected Layout** - `_protected.tsx` with automatic redirects
- **useAuth Hook** - Session management with Better Auth client
- **useTeam Hook** - Team members data fetching

#### Database
- `user`, `session`, `account`, `verification` (Better Auth)
- `userProfiles` - Extended user profiles
- `businessUsers` - Business membership with roles
- `staffInvitations` - Invitation system

---

### Module 2: Business Management
**Status:** ✅ Complete  
**Date:** Feb 12, 2026

#### Backend
- **Business API** - `/businesses/*`
  - `GET /businesses/me` - Get current business
  - `POST /businesses` - Create business
  - `PUT /businesses/:id` - Update business info
  - `POST /businesses/:id/logo` - Upload logo to R2
- **Payment Method Configuration** - `/businesses/payment-methods/*`
  - `GET /businesses/payment-methods` - Get configuration
  - `PUT /businesses/payment-methods` - Update configuration
  - Supports: `efectivo`, `yape`, `plin`, `transferencia`, `tarjeta`

#### Frontend
- **Business Pages**
  - `/business/create` - Create business
  - `/business/edit` - Edit business
- **Configuration Panel** - `/config/*`
  - `/config` - General settings
  - `/config/appearance` - Appearance settings
  - `/config/notifications` - Notification settings
  - `/config/inventory` - Inventory settings
  - `/config/security` - Security settings
  - `/config/payment-methods` - Payment methods configuration

#### Features
- Multi-tenancy support
- Business logo upload to Cloudflare R2
- Per-business payment method configuration
- Distribution mode toggle (`usarDistribucion`)
- Stock validation toggle (`permitirVentaSinStock`)

---

### Module 3: Customer Management
**Status:** ✅ Complete  
**Date:** Feb 12, 2026

#### Backend
- **Customer API** - `/customers/*`
  - `GET /customers` - List with search, pagination
  - `GET /customers/:id` - Get customer details
  - `POST /customers` - Create customer
  - `PUT /customers/:id` - Update customer
  - `DELETE /customers/:id` - Delete customer
- **Customer Service** - Business logic with RBAC permissions
- **Customer Repository** - Data access with business filtering

#### Frontend
- **Customer Pages**
  - `/clientes` - Customer list with search
  - `/clientes/nuevo` - Create customer form
  - `/clientes/:id` - Customer detail with history
  - `/clientes/:id/edit` - Edit customer
- **Components**
  - `CustomerCard` - Reusable customer display
  - `CustomerForm` - Form with React Hook Form + Zod
- **Hooks**
  - `useCustomers` - List customers
  - `useCustomer` - Single customer with sales history

#### Features
- Full CRUD operations
- Search by name/phone/DNI
- Automatic debt calculation (credit sales - payments)
- Purchase history per customer
- RBAC: Admins see all, vendors see customers from their sales

---

### Module 4: Product Catalog & Variants
**Status:** ✅ Complete  
**Date:** Feb 15, 2026

#### Backend
- **Product API** - `/products/*`
  - `GET /products` - List with filters (type, active, search)
  - `GET /products/:id` - Get product details
  - `POST /products` - Create product
  - `PUT /products/:id` - Update product
  - `DELETE /products/:id` - Delete product
- **Product Variants API** - `/products/:id/variants/*`, `/variants/*`
  - `GET /products/:id/variants` - List variants
  - `POST /products/:id/variants` - Create variant
  - `POST /products/:id/variants/reorder` - Reorder variants
  - `GET /variants/:id` - Get variant
  - `PUT /variants/:id` - Update variant
  - `DELETE /variants/:id` - Deactivate variant
  - `GET /variants/:id/inventory` - Get variant inventory
  - `PUT /variants/:id/inventory` - Update variant inventory

#### Frontend
- **Product Pages**
  - `/productos` - Product catalog
  - `/productos/nuevo` - Create product
  - `/productos/:id` - Product detail with variants
- **Components**
  - `ProductCard` - Product display with type badge
  - `ProductForm` - Product creation/editing
  - `VariantList` - Display product variants
  - `VariantForm` - Create/edit variants
  - `VariantModal` - Variant management modal
- **Hooks**
  - `useProducts` - List products
  - `useProductVariants` - Manage variants

#### Features
- Product types: `pollo`, `huevo`, `otro`
- Units: `kg`, `unidad`
- Variants with individual prices and SKUs
- Inventory tracking per variant
- Asset integration (product images from gallery)
- Sortable variants

#### Database
- `products` - Base product info
- `productVariants` - Variant details
- `inventory` - General inventory
- `variantInventory` - Per-variant inventory

---

### Module 5: Sales System
**Status:** ✅ Complete  
**Date:** Feb 12, 2026

#### Backend
- **Sales API** - `/sales/*`
  - `GET /sales` - List with date/type filters
  - `GET /sales/today-stats` - Today's sales statistics
  - `GET /sales/:id` - Get sale details
  - `POST /sales` - Create sale
  - `DELETE /sales/:id` - Delete sale
- **Sale Service** - Business logic for sales creation
- **Automatic Debt Tracking** - Updates customer balance on credit sales

#### Frontend
- **Sales Pages**
  - `/ventas` - Sales list
  - `/ventas/nueva` - New sale with cart
  - `/ventas/:id` - Sale detail
- **Components**
  - `SaleList` - Sales list display
  - `SaleCard` - Individual sale card
  - `SaleCartItem` - Cart item with variant selector
  - `VariantSelector` - Product variant selection
  - `CustomerSearch` - Search and select customers
- **Hooks**
  - `useSales` - List/create sales

#### Features
- Sale types: `contado` (cash), `credito` (credit)
- Cart with multiple items
- Variant selection per item
- Customer association (optional)
- Tara and net weight tracking
- Automatic inventory deduction
- Distribution-based stock validation

#### Database
- `sales` - Sale header
- `saleItems` - Sale line items with variant details

---

### Module 6: Payments & Collections
**Status:** ✅ Complete  
**Date:** Feb 12, 2026

#### Backend
- **Payments API** - `/payments/*`
  - `GET /payments` - List payments (filter by client)
  - `GET /payments/:id` - Get payment
  - `POST /payments` - Create payment
  - `DELETE /payments/:id` - Delete payment
  - `POST /payments/:id/proof` - Upload payment proof image
  - `PUT /payments/:id/reference` - Add reference number
- **Payment Methods:** `efectivo`, `yape`, `plin`, `transferencia`

#### Frontend
- **Payment Pages**
  - `/cobros` - Payments list
  - `/cobros/nuevo` - Create payment
- **Components**
  - `PaymentList` - Display payments
  - `PaymentForm` - Create payment
  - `BalanceCard` - Show customer balance
- **Hooks**
  - `usePayments` - Manage payments

#### Features
- Record payments against customer debt
- Payment proof image upload
- Reference number tracking
- Automatic balance recalculation

#### Database
- `abonos` - Payment records

---

### Module 7: Day Closing
**Status:** ✅ Complete  
**Date:** Feb 12, 2026

#### Backend
- **Closings API** - `/closings/*`
  - `GET /closings` - List closings
  - `GET /closings/today-stats` - Today's statistics
  - `GET /closings/:id` - Get closing
  - `POST /closings` - Create closing
  - `PUT /closings/:id` - Update closing
  - `DELETE /closings/:id` - Delete closing

#### Frontend
- **Closing Page**
  - `/cierre` - Day closing interface
- **Hooks**
  - `useClosings` - List/create closings
  - `useClosingTodayStats` - Today's stats

#### Features
- Daily sales summary
- Cash vs credit breakdown
- Total kilos tracking
- Sales count per closing

#### Database
- `closings` - Closing records

---

## Advanced Modules ✅

### Module 8: Inventory Management
**Status:** ✅ Complete  
**Date:** Feb 15, 2026

#### Backend
- **Inventory API** - `/inventory/*`
  - `GET /inventory` - List all inventory
  - `GET /inventory/:productId` - Get product inventory
  - `PUT /inventory/:productId` - Update stock
  - `POST /inventory/:productId/validate` - Check stock availability

#### Frontend
- **Components**
  - `InventoryCard` - Display inventory item
- **Hooks**
  - `useInventory` - Manage inventory

#### Features
- Real-time stock tracking
- Per-variant inventory
- Stock validation before sales
- Low stock indicators

---

### Module 9: Distribution System
**Status:** ✅ Complete  
**Date:** Feb 16, 2026

#### Backend
- **Distribution API** - `/distribuciones/*`
  - `GET /distribuciones` - List distributions (admin: all, vendor: own)
  - `GET /distribuciones/mine` - Get current vendor's distribution
  - `GET /distribuciones/:id` - Get distribution with items
  - `GET /distribuciones/:id/stock` - Calculate available stock
  - `GET /distribuciones/:id/items` - List distribution items
  - `POST /distribuciones` - Create distribution (admin only)
  - `PUT /distribuciones/:id` - Update distribution
  - `PATCH /distribuciones/:id/close` - Close distribution
  - `DELETE /distribuciones/:id` - Delete distribution

#### Frontend
- **Distribution Pages**
  - `/distribuciones` - Distribution management (admin)
  - `/mi-distribucion` - Vendor's current distribution
- **Components**
  - `DistribucionTable` - Distribution list table
- **Hooks**
  - `useDistribuciones` - Manage distributions

#### Features
- Three distribution modes:
  - `estricto` - Cannot exceed assigned quantity
  - `acumulativo` - Accumulates across days
  - `libre` - No restrictions
- Daily assignments to vendors
- Point of sale tracking (`puntoVenta`)
- Automatic sold quantity calculation
- Stock availability calculation (assigned - sold)
- Trust vendor mode (`confiarEnVendedor`)

#### Database
- `distribuciones` - Distribution header
- `distribucionItems` - Assigned items per variant

---

### Module 10: Suppliers & Purchases
**Status:** ✅ Complete  
**Date:** Feb 17, 2026

#### Backend
- **Suppliers API** - `/suppliers/*`
  - `GET /suppliers` - List suppliers
  - `GET /suppliers/generic` - Get generic supplier
  - `GET /suppliers/:id` - Get supplier
  - `POST /suppliers` - Create supplier
  - `PUT /suppliers/:id` - Update supplier
  - `DELETE /suppliers/:id` - Delete supplier
- **Purchases API** - `/purchases/*`
  - `GET /purchases` - List purchases
  - `GET /purchases/:id` - Get purchase
  - `POST /purchases` - Create purchase
  - `PUT /purchases/:id/status` - Update status (pending, received, cancelled)
  - `DELETE /purchases/:id` - Delete purchase

#### Frontend
- **Supplier Pages**
  - `/proveedores` - Supplier list
  - `/proveedores/nuevo` - Create supplier
- **Purchase Pages**
  - `/compras` - Purchase list
  - `/compras/nueva` - Create purchase
- **Hooks**
  - `useSuppliers` - Manage suppliers
  - `usePurchases` - Manage purchases

#### Features
- Supplier types: `generic`, `regular`, `internal`
- Purchase workflow: pending → received → cancelled
- Automatic inventory update on purchase receipt
- Generic supplier for anonymous purchases

#### Database
- `suppliers` - Supplier information
- `purchases` - Purchase orders
- `purchaseItems` - Purchase line items

---

### Module 11: Reports & Analytics
**Status:** ✅ Complete  
**Date:** Feb 17, 2026

#### Backend
- **Reports API** - `/reports/*`
  - `GET /reports/accounts-receivable` - List customers with debt
  - `GET /reports/accounts-receivable/total` - Total receivables amount

#### Frontend
- **Reports Pages**
  - `/reportes/cuentas-por-cobrar` - Accounts receivable report
- **Components**
  - `SummaryCard` - Statistics cards
  - `SummaryStats` - Summary statistics
  - `FilterCard` - Report filters
  - `AccountsList` - Accounts list
  - `AccountItem` - Individual account
- **Hooks**
  - `useAccountsReceivable` - Fetch report data

#### Features
- Debt filtering by minimum balance
- Search by customer name
- Summary statistics (total, count, average)
- Sortable list

---

### Module 12: Sync Engine & Assets
**Status:** ✅ Complete (Sync), ✅ Complete (Assets)  
**Date:** Feb 18, 2026

#### Backend
- **Sync API** - `/sync/*`
  - `POST /sync/batch` - Process batch operations
  - `GET /sync/changes` - Get changes since timestamp
- **Assets API** - `/assets/*`
  - `GET /assets` - List assets
  - `POST /assets` - Create asset
  - `DELETE /assets/:id` - Delete asset
- **Files API** - `/files/*`
  - `POST /files/upload` - Upload file
  - `GET /files/:id` - Get file
  - `DELETE /files/:id` - Delete file

#### Frontend
- **Sync Components**
  - `SyncStatus` - Connection status indicator
- **Asset Components**
  - `AssetGallery` - Asset browser
  - `AssetPicker` - Asset selector
  - `FormAssetPicker` - Form-integrated picker
- **Hooks**
  - `useSyncEngine` - Sync operations
  - `useAssets` - Manage assets
  - `useFiles` - File uploads

#### Features
- Batch sync operations
- Offline operation queue
- Cloudflare R2 file storage
- Shared asset gallery
- Private file uploads

#### Database
- `syncOperations` - Sync queue
- `assets` - Shared gallery
- `files` - Private files

---

## Technical Architecture

### Backend Stack
- **Framework:** ElysiaJS
- **Auth:** Better Auth
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL (Neon)
- **Storage:** Cloudflare R2
- **Runtime:** Bun

### Frontend Stack
- **Framework:** React Router v7
- **State:** TanStack Query, Jotai
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui, Tailwind CSS
- **Build:** Vite

### Patterns Implemented
- **RequestContext** - RBAC permissions across all APIs
- **Repository Pattern** - Data access abstraction
- **Service Pattern** - Business logic encapsulation
- **Multi-tenancy** - Business-scoped data
- **Offline-first** - Sync engine for offline operations

---

## Complete API Inventory

### Authentication & Profile
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/*` | Various | Better Auth endpoints |
| `/profile` | GET/PUT | User profile management |

### Business & Team
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/businesses/me` | GET | Get current business |
| `/businesses` | POST | Create business |
| `/businesses/:id` | PUT | Update business |
| `/businesses/:id/logo` | POST | Upload logo |
| `/businesses/me/members` | GET | List team members |
| `/businesses/me/members/:id` | PUT/DELETE | Manage members |
| `/businesses/payment-methods` | GET/PUT | Payment configuration |
| `/invitations` | GET/POST | Manage invitations |
| `/invitations/:id/cancel` | POST | Cancel invitation |
| `/public/invitations/:token` | GET | Validate invitation |
| `/public/invitations/accept` | POST | Accept invitation |

### Customers
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/customers` | GET/POST | List/Create |
| `/customers/:id` | GET/PUT/DELETE | CRUD |

### Products & Variants
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/products` | GET/POST | List/Create |
| `/products/:id` | GET/PUT/DELETE | CRUD |
| `/products/:id/variants` | GET/POST | Manage variants |
| `/products/:id/variants/reorder` | POST | Reorder variants |
| `/variants/:id` | GET/PUT/DELETE | Variant CRUD |
| `/variants/:id/inventory` | GET/PUT | Variant inventory |

### Inventory
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/inventory` | GET | List all |
| `/inventory/:productId` | GET/PUT | Manage stock |
| `/inventory/:productId/validate` | POST | Check availability |

### Sales
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sales` | GET | List with filters |
| `/sales/today-stats` | GET | Today's stats |
| `/sales/:id` | GET | Get sale |
| `/sales` | POST | Create sale |
| `/sales/:id` | DELETE | Delete sale |

### Payments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/payments` | GET/POST | List/Create |
| `/payments/:id` | GET/DELETE | Get/Delete |
| `/payments/:id/proof` | POST | Upload proof |
| `/payments/:id/reference` | PUT | Add reference |

### Closings
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/closings` | GET/POST | List/Create |
| `/closings/today-stats` | GET | Today's stats |
| `/closings/:id` | GET/PUT/DELETE | CRUD |

### Distributions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/distribuciones` | GET/POST | List/Create |
| `/distribuciones/mine` | GET | My distribution |
| `/distribuciones/:id` | GET | Get details |
| `/distribuciones/:id/stock` | GET | Available stock |
| `/distribuciones/:id/items` | GET | List items |
| `/distribuciones/:id` | PUT | Update |
| `/distribuciones/:id/close` | PATCH | Close |
| `/distribuciones/:id` | DELETE | Delete |

### Suppliers
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/suppliers` | GET/POST | List/Create |
| `/suppliers/generic` | GET | Get generic |
| `/suppliers/:id` | GET/PUT/DELETE | CRUD |

### Purchases
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/purchases` | GET/POST | List/Create |
| `/purchases/:id` | GET | Get |
| `/purchases/:id/status` | PUT | Update status |
| `/purchases/:id` | DELETE | Delete |

### Reports
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/reports/accounts-receivable` | GET | Receivables |
| `/reports/accounts-receivable/total` | GET | Total amount |

### Sync
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sync/batch` | POST | Process batch |
| `/sync/changes` | GET | Get changes |

### Assets & Files
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/assets` | GET/POST | Manage assets |
| `/assets/:id` | DELETE | Delete asset |
| `/files/upload` | POST | Upload file |
| `/files/:id` | GET/DELETE | Manage files |

---

## Database Schema Inventory

### Authentication (Better Auth)
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth accounts
- `verification` - Email verifications

### Profiles & Business
- `userProfiles` - Extended user data
- `businesses` - Business entities
- `businessUsers` - Business memberships
- `businessPaymentSettings` - Payment configuration
- `staffInvitations` - Team invitations

### Catalog
- `products` - Base products
- `productVariants` - Product variants
- `assets` - Shared gallery images

### Inventory
- `inventory` - General inventory
- `variantInventory` - Per-variant inventory
- `distribuciones` - Vendor distributions
- `distribucionItems` - Distribution items

### Sales & Payments
- `customers` - Customer records
- `sales` - Sale transactions
- `saleItems` - Sale line items
- `abonos` - Payment records

### Operations
- `closings` - Day closings
- `suppliers` - Supplier records
- `purchases` - Purchase orders
- `purchaseItems` - Purchase line items

### System
- `files` - Private file records
- `syncOperations` - Sync queue
- `systemConfig` - System configuration

---

## Frontend Routes Inventory

### Public Routes
| Route | Component |
|-------|-----------|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Register |
| `/invitations/:token` | Accept invitation |

### Protected Routes (with layout)
| Route | Description |
|-------|-------------|
| `/dashboard` | Main dashboard |
| `/clientes` | Customer list |
| `/clientes/nuevo` | New customer |
| `/clientes/:id` | Customer detail |
| `/clientes/:id/edit` | Edit customer |
| `/productos` | Product catalog |
| `/productos/nuevo` | New product |
| `/productos/:id` | Product detail |
| `/ventas` | Sales list |
| `/ventas/nueva` | New sale |
| `/ventas/:id` | Sale detail |
| `/cobros` | Payments list |
| `/cobros/nuevo` | New payment |
| `/cierre` | Day closing |
| `/calculadora` | Calculator |
| `/proveedores` | Suppliers list |
| `/proveedores/nuevo` | New supplier |
| `/compras` | Purchases list |
| `/compras/nueva` | New purchase |
| `/distribuciones` | Distributions (admin) |
| `/mi-distribucion` | My distribution |
| `/config` | Configuration home |
| `/config/appearance` | Appearance |
| `/config/notifications` | Notifications |
| `/config/inventory` | Inventory settings |
| `/config/security` | Security |
| `/config/payment-methods` | Payment methods |
| `/business/create` | Create business |
| `/business/edit` | Edit business |
| `/profile` | User profile |
| `/team` | Team management |
| `/invitations` | Invitations list |
| `/reportes/cuentas-por-cobrar` | Receivables report |

---

## Next Steps / Roadmap

### Phase 1: UX Improvements
- [ ] Toast notifications for action feedback
- [ ] Optimistic updates in cart
- [ ] Swipe actions in lists (delete, edit)
- [ ] Pull-to-refresh on mobile
- [ ] Skeleton loading states
- [ ] Error boundaries

### Phase 2: Advanced Reports
- [ ] Sales by period report
- [ ] Revenue by vendor
- [ ] Customer ranking
- [ ] Product performance
- [ ] Export to Excel/PDF
- [ ] Charts and visualizations

### Phase 3: Offline-First Completion
- [ ] Complete TanStack DB + Electric SQL integration
- [ ] Automatic sync when online
- [ ] Conflict resolution
- [ ] Offline indicators
- [ ] Queue management UI

### Phase 4: Mobile App
- [ ] PWA configuration
- [ ] Push notifications
- [ ] Background sync
- [ ] Native-like gestures

### Phase 5: Advanced Features
- [ ] Multi-currency support
- [ ] Advanced discounts/promotions
- [ ] Customer loyalty program
- [ ] Advanced analytics dashboard
- [ ] API rate limiting
- [ ] Audit logging

---

## Notes

- Better Auth tables auto-create on first request
- Session persistence: 7 days
- Design optimized for mobile (field vendors)
- Electric SQL ready for activation when shapes configuration is complete
- All backend APIs tested and working
- R2 storage configured for file uploads
- Multi-tenancy enforced at all levels

---

*This document should be updated weekly or after significant feature additions.*

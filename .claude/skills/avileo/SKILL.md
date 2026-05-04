---
name: avileo
description: Avileo - Online-first chicken sales management system. Use when working
  on the Avileo project, implementing sales features, database schema, or any
  code related to this chicken business management app. Covers monorepo
  structure, Bun/ElysiaJS backend, React Router v7 frontend, Drizzle ORM,
  PostgreSQL, TanStack Query, and online-first architecture.
---

# Avileo Project Reference

> **Avileo** - Online-first chicken sales management system for businesses selling chicken (live, dressed, cuts) and related products.

## Project Overview

Avileo is a comprehensive sales management system designed for chicken businesses. It operates as an **online-first** web application with PWA capabilities, serving vendors and administrators through a mobile-optimized interface.

### Key Characteristics

- **Online-First Architecture**: Requires internet for full operation, with PWA caching for basic resilience
- **Multi-Tenancy**: Single user can belong to multiple businesses
- **Flexible Operation Modes**: Supports various business models
- **Mobile-First**: Designed for vendors using mobile devices
- **Real-time Dashboard**: Admin panel with live data
- **Unified Sales**: Single `sales` table supports both instant sales (`instant_sale`) and pre-orders (`pre_order`)

### Business Problem Solved

Traditional chicken businesses operate manually:
- Price calculations by hand or calculator
- Accounts receivable in paper notebooks
- No tracking of who sells what
- Difficult to know daily sales totals
- **Vendors need digital tools accessible from any device**

### Solution

- Web-based sales recording accessible from any device
- Automatic price calculations (with tare subtraction)
- Digital accounts receivable management
- Inventory assignment to vendors (optional)
- Real-time collection tracking
- WhatsApp integration for notifications
- Public catalog for customer pre-orders

## Project Structure

```
avileo/
├── packages/
│   ├── app/              # React Router v7 frontend (@avileo/app)
│   ├── backend/          # ElysiaJS + Drizzle backend (@avileo/backend)
│   └── shared/           # Shared types & utilities (@avileo/shared)
├── docs/
│   ├── technical/        # Architecture & database docs
│   ├── development/      # Development phases
│   └── screens/          # UI patterns, mobile list pattern
├── .claude/
│   └── skills/avileo/    # This skill
└── package.json          # Turborepo root
```

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Runtime** | Bun | 1.1.38+ |
| **Frontend** | React Router v7 | latest |
| **Backend** | ElysiaJS | latest |
| **Database** | PostgreSQL | 16.x |
| **ORM** | Drizzle ORM | latest |
| **Auth** | Better Auth | latest |
| **State (Server)** | TanStack Query | 5.x |
| **State (Client)** | Jotai | latest |
| **API Client** | Eden Treaty | latest |
| **Styling** | Tailwind CSS | 3.x |
| **UI** | shadcn/ui | latest |

## Quick Reference

### Build Commands
```bash
# Root level (runs via turbo)
bun run dev          # Start all dev servers
bun run build        # Build all packages
bun run db:migrate   # Run database migrations
bun run db:generate  # Generate Drizzle migrations

# Individual packages
cd packages/app && bun run dev       # Frontend only (port 5173)
cd packages/backend && bun run dev   # Backend only (port 3000)
cd packages/shared && bun run build  # Build shared package
```

### Database Commands
```bash
cd packages/backend
bun run db:generate  # Generate migration files
bun run db:migrate   # Run pending migrations
bun run db:push      # Push schema changes (dev only)
bun run db:reset     # Reset database (keeps demo user)
bun run db:seed:demo # Seed demo account data
bun run db:studio    # Open Drizzle Studio
```

### Testing Commands
```bash
cd packages/app && bun test              # Vitest unit tests
cd packages/app && bun run test:e2e      # Playwright E2E tests
cd packages/backend && bun test          # Backend unit tests
cd packages/backend && bun run test:e2e  # Backend E2E tests
```

## Operation Modes

The system supports 4 modes configurable per business:

1. **Inventario Propio** (Traditional): Buy chicken, process, distribute to vendors
2. **Sin Inventario** (Commission): Vendors sell third-party chicken, no stock control
3. **Pedidos Primero** (Pre-sale): Orders first, then buy chicken to fulfill
4. **Mixto** (Hybrid): Combination based on day/season

### Mode Configuration
```typescript
interface BusinessConfig {
  controlKilos: boolean;        // Track stock
  usarDistribucion: boolean;    // Use daily distribution
  permitirVentaSinStock: boolean; // Allow sales without assigned stock
  publicCatalogEnabled: boolean;  // Enable public customer catalog
}
```

## Core Modules

| Module | Description | Status |
|--------|-------------|--------|
| **Authentication** | Login/logout with JWT (Better Auth) | ✅ |
| **Users & Roles** | Admin and vendor management, staff invitations | ✅ |
| **Calculator** | Price calculations with tare (sales, orders, purchases) | ✅ |
| **Sales** | Cash and credit sales, unified with pre-orders | ✅ |
| **Customers** | Accounts receivable, tags, groups | ✅ |
| **Abonos** | Debt payments, linked to sales | ✅ |
| **Distribution** | Daily inventory assignment to vendors | ✅ |
| **Purchases** | Buy inventory from suppliers | ✅ |
| **Products** | Product catalog with variants, categories, units | ✅ |
| **Suppliers** | Vendor/supplier management | ✅ |
| **Visitas** | Customer visit tracking linked to distributions | ✅ |
| **Cierre** | Daily closing reports | ✅ |
| **Public Catalog** | Customer-facing pre-order page | ✅ |
| **Payment Methods** | Configurable payment methods per business | ✅ |
| **WhatsApp** | Templates and messaging | ✅ |
| **Reports** | Dashboard and analytics | ⚠️ Partial |

## Documentation Structure

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and patterns
- **[DATABASE.md](DATABASE.md)** - Database schema, relations, enums
- **[MODULES.md](MODULES.md)** - Business modules, workflows, and use cases
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development phases, commands, and guidelines
- **[referencias/toolbar-actions.md](referencias/toolbar-actions.md)** - ToolbarActions component pattern
- **[referencias/file-upload-pattern.md](referencias/file-upload-pattern.md)** - File upload with mobile camera support
- **[referencias/public-catalog-pattern.md](referencias/public-catalog-pattern.md)** - Public catalog pattern
- **[referencias/cierre-pattern.md](referencias/cierre-pattern.md)** - Cierre del dia pattern

## Important Constraints

### Limitations
1. Login requires internet - JWT cached 24-48h
2. Simultaneous edit conflicts - "last wins" strategy
3. PWA provides basic caching but full functionality requires connection

### Business Contradictions Resolved
| Contradiction | Resolution |
|---------------|------------|
| "Real-time dashboard" vs "Mobile vendors" | Dashboard shows live data from server; vendors use mobile web app |
| "Instant cash closing" vs "Multiple vendors" | Closing calculated from server data with vendor filtering |

## Key Files to Reference

### Documentation
- `docs/technical/readme.md` - Main technical plan
- `docs/technical/database.md` - Complete ER diagram
- `docs/development/readme.md` - Development roadmap
- `docs/screens/mobile-list-pattern.md` - Mobile UI patterns
- `docs/OVERVIEW-FLUJOS.md` - Implementation status per screen
- `AGENTS.md` - Project conventions and commands

### Code
- `packages/backend/src/db/schema/` - Drizzle schema files
- `packages/app/app/routes/` - Frontend routes
- `packages/shared/src/index.ts` - Shared types
- `packages/shared/src/transformers/` - Decimal/entity transformers
- `packages/app/app/lib/api-client.ts` - Eden Treaty API client

## Utilities

### Decimal Transformers (`packages/shared/src/transformers/`)

3-level transformer system for converting between backend decimal strings and UI form values.

**Level 1 — Core:** `createTransformer<T>(config)` factory
**Level 2 — Decimal:** `decimalToNumber`, `decimalToString(n)` helpers
**Level 3 — Entity:** Pre-built transformers per domain entity

```typescript
import { saleItemTransformer, decimalToNumber, decimalToString } from "@avileo/shared";

// Entity transformer (recommended)
const uiItem    = saleItemTransformer.toForm(backendItem);   // strings for forms
const apiPayload = saleItemTransformer.toApi(formValues);    // numbers for API
const numbers   = saleItemTransformer.toNumbers(item);       // all to number

// Ad-hoc helpers
const priceStr  = decimalToString(2)(12.5);  // "12.50"
const priceNum  = decimalToNumber("12.50");  // 12.5
```

**Available entity transformers:** `saleTransformer`, `saleItemTransformer`, `purchaseItemTransformer`, `distribucionItemTransformer`.

**Conventions:**
- `toForm` → strings with fixed decimals (for inputs)
- `toApi`  → numbers (for API payloads)
- `toNumbers` → all configured fields to number
- Uses `DECIMALS` standards from `packages/shared/src/standards/decimals`

## Frontend Architecture Rules

### Rule 1: Business Logic in Services, Not Hooks

**Anti-pattern** — business logic in hooks:
```typescript
// ❌ BAD: Business logic in hook
export function useCreateSale() {
  return useMutation({
    mutationFn: async ({ sale, items }) => {
      if (!sale.customerId) throw new Error("Customer required");
      const sellerId = business?.businessUserId;
      if (!sellerId) throw new Error("Business seller required");
      // ... more business rules
    }
  });
}
```

**Correct pattern** — service handles business logic:
```typescript
// ✅ GOOD: Service handles business logic
export class SaleService {
  async createSale(input: CreateSaleInput): Promise<Sale> {
    if (!input.customerId) throw new Error("Customer required");
    // ... business rules in service
  }
}

// Hook only orchestrates
export function useCreateSale() {
  return useMutation({
    mutationFn: (input) => saleService.createSale(input)
  });
}
```

**Hook responsibilities**:
- Query key management
- `onSuccess`/`onError` callbacks (UI-side only)
- Query invalidation
- Connecting to API client

### Rule 2: Service Composition Over Complex Inheritance

**Anti-pattern** — reimplementing CRUD manually:
```typescript
// ❌ BAD: All CRUD manually in service
export class ProductService {
  async findAll() { /* manual query */ }
  async create(data) { /* manual insert */ }
  async update(id, data) { /* manual update */ }
}
```

**Correct pattern** — extend generated or use API client:
```typescript
// ✅ GOOD: Use Eden Treaty API client or extend generated service
export class ProductService {
  async findByCategory(categoryId: string) {
    // Custom method only, use api.products.get() for CRUD
  }
}
```

### Rule 3: Structured Logging Only

**Anti-pattern** — raw console.log/error:
```typescript
// ❌ BAD: Raw console usage
console.log("Sale created", sale);
console.error("Failed to create", error);
```

**Correct pattern** — structured logging with tags:
```typescript
// ✅ GOOD: Tagged performance logs
console.log("[Perf][SaleService] createDraft", { saleId: sale.id, totalMs });
console.log("[Perf][useCreateDraftSale] mutationFn", { ... });

// ✅ GOOD: Error logging
console.error("[SaleService] createDraft failed", { error: error.message });
```

**Tags to use**:
- `[Perf][ServiceName]` — performance measurements
- `[Error][ServiceName]` — error conditions
- `[API][ServiceName]` — API-related events

### Rule 4: Domain Errors via throw, Hooks Handle

**Anti-pattern** — catching and swallowing errors in service:
```typescript
// ❌ BAD: Swallowing errors in service
try {
  await api.sales.update(id, data);
} catch (error) {
  console.error(error);
  // Error disappears here
}
```

**Correct pattern** — let errors propagate:
```typescript
// ✅ GOOD: Service throws domain errors
async confirmSale(id: string) {
  const sale = await this.findById(id);
  if (sale.status !== "draft") {
    throw new Error("Only draft sales can be confirmed");
  }
  await api.sales.update(id, { status: "confirmed" });
}

// Hook handles error with onError
useMutation({
  mutationFn: (id) => saleService.confirmSale(id),
  onError: (error) => {
    showError("Error al confirmar", error.message);
  }
});
```

## Glossary

| Term | Definition |
|------|------------|
| **Tara** | Container weight subtracted from gross weight |
| **Distribucion del Dia** | Daily inventory assignment to vendors (optional) |
| **Abono** | Debt payment independent of sales |
| **Modo Libre** | Sales recording without stock control |
| **Punto de Venta** | Sales location/branch |
| **Venta al Credito** | Credit sale (accounts receivable) |
| **Venta al Contado** | Cash sale |
| **Pre-orden / Pedido** | Pre-order for future delivery |
| **Cierre** | Daily closing report by vendor |
| **Visita** | Customer visit tracking during distribution |
| **Variante** | Product variant (e.g., "1kg", "Medio") |

---

*Last updated: May 2026*
*For detailed information, see linked documentation files.*

# Avileo Development Guide

> Development phases, commands, and guidelines for the Avileo project.

## Table of Contents

1. [Development Phases](#development-phases)
2. [Quick Commands](#quick-commands)
3. [Project Structure](#project-structure)
4. [Code Style](#code-style)
5. [Git Workflow](#git-workflow)
6. [Testing](#testing)
7. [Environment Setup](#environment-setup)
8. [Troubleshooting](#troubleshooting)

---

## Development Phases

### Overview

The project is organized into **10 incremental phases**. Each phase is an independent module.

```
Timeline: 5 weeks (25-35 working days)

Week 1: [01-Auth] [02-Users]
Week 2: [03-Core-API] [04-Sales]
Week 3: [05-Customers] [06-Calculator]
Week 4: [07-Inventory] [08-Purchases]
Week 5: [09-Reports] [10-Config]
```

### Phase 1: Authentication (3-4 days)

**Objective:** Login/logout with JWT via Better Auth

**Deliverable:** Functional login screen

**Key Tasks:**
- Setup Better Auth
- Create login form
- JWT token handling
- Session persistence

**Dependencies:** None

---

### Phase 2: Users (4-5 days)

**Objective:** User CRUD, role management, and staff invitations

**Deliverable:** Admin panel to create/edit users with roles, invitation system

**Key Tasks:**
- User creation form
- Role assignment (ADMIN_NEGOCIO, VENDEDOR)
- User listing
- Sales point assignment
- Staff invitation flow (send email → accept token)

**Dependencies:** Phase 1

---

### Phase 3: Core API (5-7 days)

**Objective:** Base API infrastructure

**Deliverable:** REST API with all core endpoints

**Key Tasks:**
- ElysiaJS server setup
- Drizzle ORM configuration
- RequestContext pattern
- Error handling
- Multi-tenancy middleware

**Dependencies:** Phase 1, 2

---

### Phase 4: Sales (5-6 days)

**Objective:** Sale registration (instant_sales and pre_orders)

**Deliverable:** Sale screen with unified sales table

**Key Tasks:**
- Sale form (cash/credit)
- Multiple products with variants
- Sale without customer
- Pre-order support (delivery date, customer edit)
- Cancellation with refund tracking

**Dependencies:** Phase 3

---

### Phase 5: Customers, Tags & Abonos (4-5 days)

**Objective:** Customer management, segmentation, and debt payments

**Deliverable:** Customer CRUD + abono registration + tags/groups

**Key Tasks:**
- Customer CRUD
- Debt calculation
- Abono registration (independent of sales)
- Payment proof upload (camera/gallery)
- Tags and groups for segmentation

**Dependencies:** Phase 3, 4

---

### Phase 6: Calculator (2-3 days)

**Objective:** Price calculator with tare

**Deliverable:** 100% functional calculator

**Key Tasks:**
- Calculate any 2 values, get 3rd
- Tare subtraction
- Configurable price per kg
- Context-aware (sales, orders, purchases)

**Dependencies:** None (can be done in parallel)

---

### Phase 7: Inventory, Distribution & Purchases (4-5 days)

**Objective:** Stock control, daily assignment, and supplier purchases

**Deliverable:** Distribution panel + kilo control + purchase flow

**Key Tasks:**
- Product catalog with variants and categories
- Inventory tracking (variant_inventory)
- Daily distribution to vendors
- Distribution closing (cierre)
- Visitas tracking
- Purchase orders from suppliers
- Supplier management
- Performance tracking

**Dependencies:** Phase 2, 3

---

### Phase 8: Public Catalog & Payment Methods (3-4 days)

**Objective:** Public customer catalog and configurable payment methods

**Deliverable:** Public pre-order page + payment configuration

**Key Tasks:**
- Public catalog enable/disable
- Catalog slug configuration
- Customer pre-order flow
- Payment methods configuration per business
- QR code upload for Yape/Plin

**Dependencies:** Phase 4, 7

---

### Phase 9: Reports & Cierre (4-5 days)

**Objective:** Statistics, reports, and daily closing

**Deliverable:** Dashboard with charts, cierre del dia, exportable reports

**Key Tasks:**
- Sales reports
- Vendor performance
- Debt reports
- Daily closing (cierre)
- Export to Excel/PDF

**Dependencies:** Phase 4, 5, 7

---

### Phase 10: Configuration & WhatsApp (3-4 days)

**Objective:** System configuration and WhatsApp integration

**Deliverable:** Flexible configuration panel + WhatsApp messaging

**Key Tasks:**
- Operation mode selector
- Price configuration
- Business settings
- Permission configuration
- WhatsApp templates
- Message sending

**Dependencies:** All previous

---

## Quick Commands

### Root Level Commands

```bash
# Start all dev servers (via turbo)
bun run dev

# Build all packages
bun run build

# Run database migrations
bun run db:migrate

# Generate Drizzle migrations
bun run db:generate
```

### Frontend (@avileo/app)

```bash
cd packages/app

# Start dev server (port 5173)
bun run dev

# Build for production
bun run build

# Type check with tsc
bun run typecheck

# Preview production build
bun run preview

# Run tests
bun test

# Run E2E tests
bun run test:e2e
```

### Backend (@avileo/backend)

```bash
cd packages/backend

# Start dev server (port 3000)
bun run dev

# Build for production
bun run build

# Database commands
bun run db:generate    # Generate migrations
drizzle-kit generate   # Alternative

bun run db:migrate     # Run migrations
drizzle-kit migrate    # Alternative

bun run db:push        # Push schema (dev only)
drizzle-kit push       # Alternative

bun run db:studio      # Open Drizzle Studio
drizzle-kit studio     # Alternative

bun run db:reset       # Reset database (keeps demo user)
bun run db:seed:demo   # Seed demo account data

# Tests
bun test
bun run test:e2e
```

### Shared Package (@avileo/shared)

```bash
cd packages/shared

# Build package
bun run build

# Rebuild after type changes
# (Required when modifying shared types)
```

### Adding Dependencies

```bash
# Add to single package
cd packages/app && bun add lodash

# Add to all packages (root)
bun add -d typescript
```

---

## Project Structure

### Directory Layout

```
avileo/
├── packages/
│   ├── app/                 # Frontend (@avileo/app)
│   │   ├── app/
│   │   │   ├── routes/      # File-based routing
│   │   │   │   ├── _index.tsx
│   │   │   │   ├── _protected.*
│   │   │   │   ├── venta.$slug._index.tsx  # Public catalog
│   │   │   │   └── ...
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── lib/
│   │   │   │   ├── db/      # Zod entity schemas
│   │   │   │   ├── api-client.ts  # Eden Treaty client
│   │   │   │   └── ...
│   │   │   └── root.tsx     # Root layout
│   │   ├── public/          # Static assets
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── backend/             # Backend (@avileo/backend)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/  # Drizzle schema (25+ tables)
│   │   │   │   └── lib/
│   │   │   │       └── db.ts
│   │   │   ├── api/         # API routes
│   │   │   ├── services/
│   │   │   │   ├── repository/  # Data access
│   │   │   │   └── business/    # Business logic
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── shared/              # Shared (@avileo/shared)
│       ├── src/
│       │   ├── schema.ts    # Shared Zod schemas
│       │   └── transformers/ # Decimal transformers
│       ├── package.json
│       └── tsup.config.ts
│
├── docs/                    # Documentation
│   ├── technical/           # Architecture docs
│   ├── development/         # Phase guides (01-10)
│   ├── screens/             # UI patterns, mobile list pattern
│   └── OVERVIEW-FLUJOS.md   # Implementation status
│
├── .claude/
│   └── skills/
│       └── avileo/          # This skill
│
├── package.json             # Turborepo root
├── turbo.json               # Turbo config
└── AGENTS.md                # Project conventions
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.tsx | `UserCard.tsx` |
| Routes | camelCase.tsx | `sales.tsx` |
| Utilities | kebab-case.ts | `format-date.ts` |
| Schema files | kebab-case.ts | `user-profiles.ts` |
| Hooks | camelCase.ts | `useAuth.ts` |

### Import Patterns

**Backend (NO path aliases):**
```typescript
// Use relative imports only
import { db } from "./lib/db";
import { users } from "../db/schema/users";
```

**Frontend (path aliases):**
```typescript
// Use ~/* or @/* for app imports
import { Component } from "~/components/Button";
import { useAuth } from "~/hooks/useAuth";
```

**Cross-package:**
```typescript
// Workspace protocol
import type { ApiResponse } from "@avileo/shared";
```

---

## Code Style

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ESM only (`"type": "module"`)
- **Strict mode**: Enabled in all packages
- **JSX**: `react-jsx` (frontend)

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserCard` |
| Functions | camelCase | `formatDate` |
| Constants | UPPER_SNAKE_CASE | `API_URL` |
| Types | PascalCase | `UserData` |
| Database tables | snake_case | `user_profiles` |
| Files | kebab-case.ts | `customer-card.tsx` |

### Error Handling

**Backend:**
```typescript
// Return structured error responses
return new Response(
  JSON.stringify({ success: false, error: "Message" }),
  { status: 400, headers: { "Content-Type": "application/json" } }
);
```

**Frontend:**
```typescript
// Use ErrorBoundary (see root.tsx)
// Handle route errors with isRouteErrorResponse
```

### API Response Pattern

```typescript
import type { ApiResponse } from "@avileo/shared";

// Standard response shape
const response: ApiResponse<User> = {
  success: true,
  data: user,
  error?: string
};
```

---

## Git Workflow

### Branch Naming

```
feature/M1-authentication
feature/M4-calculator
feature/M7b-purchases-suppliers
fix/api-error-handling
hotfix/database-connection
```

### Commit Messages

```
feat: add login form
feat: implement purchase flow and supplier management
fix: resolve API error bug
docs: update API documentation
refactor: simplify service layer
```

### Pull Request Template

```markdown
## Changes
- Description of changes

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] API integration tested

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No console.log statements
```

---

## Testing

### Unit Tests (Vitest)

```bash
# Install
cd packages/app
bun add -d vitest @testing-library/react @testing-library/jest-dom jsdom

# Run tests
bun run test

# Run with coverage
bun run test --coverage
```

### E2E Tests (Playwright)

```bash
# Install
cd packages/app
bun add -D @playwright/test
bunx playwright install

# Run tests
bunx playwright test
```

### Test Scenarios

**Critical Paths:**
1. Login → Create sale → Verify on server
2. Purchase flow → Receive inventory → Verify stock
3. Public catalog → Place pre-order → Verify on admin
4. Customer payment → Verify balance update

---

## Environment Setup

### Prerequisites

- Bun 1.1.38+
- Node.js 20+ (for some tools)
- PostgreSQL 16 (or Neon account)
- Git

### Initial Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd avileo

# 2. Install dependencies
bun install

# 3. Copy environment file
cp .env.example .env

# 4. Configure environment variables
# Edit .env with your database URL

# 5. Run database migrations
cd packages/backend
bun run db:migrate

# 6. Seed demo data (optional)
bun run db:seed:demo

# 7. Start development
bun run dev
```

### Environment Variables

```bash
# Database (Neon PostgreSQL)
database_url="postgresql://.../db?sslmode=require"

# JWT
JWT_SECRET="min-32-characters-secret-key"

# Server
PORT=3000
FRONTEND_URL="http://localhost:5173"

# Better Auth
BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

### Database Setup

**Option 1: Neon (Recommended)**
1. Create account at neon.tech
2. Create new project
3. Copy connection string
4. Add to `.env`

**Option 2: Local PostgreSQL**
```bash
# Using Docker
docker run -d \
  --name avileo-db \
  -e POSTGRES_USER=avileo \
  -e POSTGRES_PASSWORD=********* \
  -e POSTGRES_DB=avileo \
  -p 5432:5432 \
  postgres:16-alpine
```

---

## Troubleshooting

### Common Issues

**Error: "Cannot find module '@/...'"**
```bash
# Check vite.config.ts has alias configured
# Verify tsconfig.json paths
```

**Error: "Database connection failed"**
```bash
# Check PostgreSQL is running
docker ps

# Verify DATABASE_URL in .env
# Ensure sslmode=require for Neon
```

**Error: "API call failed"**
```bash
# Check backend is running
# Verify CORS settings
# Check network tab for failed requests
```

**Error: "Type errors in shared package"**
```bash
cd packages/shared
bun run build
# Then restart dev servers
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=avileo:* bun run dev

# Backend debug
DEBUG=elysia:* bun run dev
```

### Reset Everything

```bash
# Clean and reinstall
rm -rf node_modules
rm -rf packages/*/node_modules
bun install

# Reset database
cd packages/backend
bun run db:reset
```

---

## Deployment

### Build for Production

```bash
# Build all packages
bun run build

# Output:
# packages/app/dist/      → Frontend
# packages/backend/dist/  → Backend
```

### Environment Variables (Production)

```bash
# Production database
database_url="postgresql://..."

# Production secrets
JWT_SECRET="strong-secret-key"
BETTER_AUTH_SECRET="strong-secret-key"

# Production URLs
FRONTEND_URL="https://app.avileo.com"
BETTER_AUTH_URL="https://api.avileo.com"
```

### Recommended Hosting

**Frontend:**
- Vercel
- Netlify
- Cloudflare Pages

**Backend:**
- Railway
- Render
- Fly.io
- Dokploy (self-hosted)

**Database:**
- Neon (PostgreSQL)
- Supabase

---

## Resources

### Documentation
- [Drizzle ORM](https://orm.drizzle.team)
- [ElysiaJS](https://elysiajs.com)
- [React Router v7](https://reactrouter.com)
- [TanStack Query](https://tanstack.com/query)
- [Better Auth](https://better-auth.com)

### Project Docs
- `docs/technical/readme.md` - Technical plan
- `docs/technical/database.md` - Database schema
- `docs/development/readme.md` - Development roadmap
- `docs/screens/mobile-list-pattern.md` - Mobile UI patterns
- `docs/OVERVIEW-FLUJOS.md` - Implementation status
- `AGENTS.md` - Project conventions

---

*For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md)*
*For business modules, see [MODULES.md](MODULES.md)*
*For database schema, see [DATABASE.md](DATABASE.md)*

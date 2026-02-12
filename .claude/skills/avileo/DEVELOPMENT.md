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
Week 2: [03-Core-Offline] [04-Sales]
Week 3: [05-Customers] [06-Calculator]
Week 4: [07-Inventory] [08-Sync]
Week 5: [09-Reports] [10-Config]
```

### Phase 1: Authentication (3-4 days)

**Objective:** Login/logout with JWT

**Deliverable:** Functional login screen that stores token

**Key Tasks:**
- Setup Better Auth
- Create login form
- JWT token handling
- Token persistence (IndexedDB)

**Dependencies:** None

---

### Phase 2: Users (4-5 days)

**Objective:** User CRUD and role management

**Deliverable:** Admin panel to create/edit users with roles

**Key Tasks:**
- User creation form
- Role assignment (ADMIN, VENDEDOR)
- User listing
- Sales point assignment

**Dependencies:** Phase 1

---

### Phase 3: Core Offline (5-7 days)

**Objective:** Base offline infrastructure

**Deliverable:** App that stores data locally and works without internet

**Key Tasks:**
- IndexedDB setup
- TanStack DB configuration
- Local persistence
- Connection detection

**Dependencies:** Phase 1, 2

---

### Phase 4: Sales (5-6 days)

**Objective:** Sale registration

**Deliverable:** Sale screen that stores offline

**Key Tasks:**
- Sale form (cash/credit)
- Multiple products
- Offline storage
- Sale without customer

**Dependencies:** Phase 3

---

### Phase 5: Customers & Abonos (4-5 days)

**Objective:** Customer management and debt payments

**Deliverable:** Customer CRUD + abono registration

**Key Tasks:**
- Customer CRUD
- Debt calculation
- Abono registration
- Offline support

**Dependencies:** Phase 3, 4

---

### Phase 6: Calculator (2-3 days)

**Objective:** Price calculator

**Deliverable:** 100% functional offline calculator

**Key Tasks:**
- Calculate any 2 values, get 3rd
- Tare subtraction
- Configurable price per kg
- Works offline

**Dependencies:** None (can be done in parallel)

---

### Phase 7: Inventory & Distribution (4-5 days)

**Objective:** Stock control and daily assignment

**Deliverable:** Distribution panel + kilo control

**Key Tasks:**
- Product catalog
- Inventory tracking
- Daily distribution
- Performance tracking

**Dependencies:** Phase 2, 3

---

### Phase 8: Sync Engine (5-7 days)

**Objective:** Offline/online sync motor

**Deliverable:** Auto-sync when online, operation queue

**Key Tasks:**
- Sync queue
- Retry logic
- Conflict resolution
- Status indicators

**Dependencies:** Phase 3, 4, 5

---

### Phase 9: Reports (4-5 days)

**Objective:** Statistics and reports for admin

**Deliverable:** Dashboard with charts and exportable reports

**Key Tasks:**
- Sales reports
- Vendor performance
- Debt reports
- Export to Excel/PDF

**Dependencies:** Phase 4, 5, 8

---

### Phase 10: Configuration (3-4 days)

**Objective:** System configuration

**Deliverable:** Flexible configuration panel

**Key Tasks:**
- Operation mode selector
- Price configuration
- Business settings
- Permission configuration

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
│   │   │   │   ├── sales.tsx
│   │   │   │   └── ...
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── lib/         # Utilities
│   │   │   └── root.tsx     # Root layout
│   │   ├── public/          # Static assets
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── backend/             # Backend (@avileo/backend)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/  # Drizzle schema
│   │   │   │   └── lib/
│   │   │   │       └── db.ts
│   │   │   ├── routes/      # API routes
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── shared/              # Shared (@avileo/shared)
│       ├── src/
│       │   └── index.ts     # Shared exports
│       ├── package.json
│       └── tsup.config.ts
│
├── docs/                    # Documentation
│   ├── technical/           # Architecture docs
│   └── development/         # Phase guides (01-10)
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
fix/sync-engine-retry
hotfix/database-connection
```

### Commit Messages

```
feat: add login form
feat: implement offline sync
fix: resolve sync queue bug
docs: update API documentation
refactor: simplify sync engine
```

### Pull Request Template

```markdown
## Changes
- Description of changes

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Offline mode tested

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
1. Login → Create sale → Sync → Verify on server
2. Offline sale → Go online → Auto-sync
3. Multiple offline sales → Batch sync
4. Conflict resolution (simultaneous edits)

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

# 6. Start development
bun run dev
```

### Environment Variables

```bash
# Database (Neon PostgreSQL)
database_url="postgresql://user:pass@host.neon.tech/db?sslmode=require"

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
  -e POSTGRES_PASSWORD=avileo123 \
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

**Error: "Prisma Client not found"**
```bash
cd packages/backend
bun run db:generate
```

**Error: "Database connection failed"**
```bash
# Check PostgreSQL is running
docker ps

# Verify DATABASE_URL in .env
# Ensure sslmode=require for Neon
```

**Error: "Sync not working"**
```bash
# Check browser console for errors
# Verify IndexedDB permissions
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
bun run db:push

# Clear IndexedDB (browser)
# DevTools → Application → IndexedDB → Delete database
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
- `docs/development/readme.md` - Development phases
- `AGENTS.md` - Project conventions

---

*For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md)*
*For business modules, see [MODULES.md](MODULES.md)*
*For database schema, see [DATABASE.md](DATABASE.md)*

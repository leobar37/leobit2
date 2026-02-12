# Avileo - Phase 0: Project Setup

## TL;DR

> **Objective:** Bootstrap the Avileo monorepo with Bun, Turborepo, ElysiaJS backend, React Router v7 frontend, Neon PostgreSQL, and compile the shared package with tsup.
>
> **Deliverables:**
> - Root `package.json` with Bun workspaces
> - `packages/backend/` - ElysiaJS server with Neon PostgreSQL connection
> - `packages/app/` - React Router v7 SPA with Vite
> - `packages/shared/` - Shared types compiled with tsup (ESM + DTS)
> - `README.md` - Human-readable setup guide
> - `AGENTS.md` - AI agent conventions and patterns
> - Working dev/build scripts
>
> **Estimated Effort:** Medium (2-3 days)
> **Parallel Execution:** Partial - Wave 1 and 2 can run in parallel
> **Critical Path:** Root setup → Shared package → Backend → App → Documentation

---

## Context

### Background
Building Avileo (PollosPro), an offline-first chicken sales management system. This is Phase 0 of 6 phases, establishing the technical foundation.

### Technical Decisions (Confirmed)
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun 1.1.38 | Fast, modern, built-in TypeScript support |
| Monorepo | Turborepo + Bun workspaces | Proven pattern from Elena project |
| Backend | ElysiaJS + Drizzle ORM | Type-safe, performant, modern |
| Database | Neon PostgreSQL | Serverless, no local Docker needed |
| Frontend | React Router v7 + Vite | File-based routing, fast HMR |
| Offline DB | TanStack DB | Will implement in Phase 2 |
| Auth | Better Auth | Will implement in Phase 1 |
| Build | tsup | For shared package (ESM + DTS output) |
| Testing | None in Phase 0 | Will add in Phase 5 |

### Target Structure (Elena-inspired)
```
avileo/
├── package.json              # Root with Bun workspaces
├── turbo.json                # Turborepo pipelines
├── bun.lock
├── README.md                 # Setup guide for humans
├── AGENTS.md                 # Conventions for AI agents
├── .env.example              # Environment variables template
└── packages/
    ├── backend/              # ElysiaJS + Drizzle + Neon
    │   ├── src/
    │   │   ├── index.ts      # Server entry
    │   │   └── lib/
    │   │       └── db.ts     # Drizzle + Neon config
    │   ├── drizzle.config.ts # Drizzle migrations config
    │   └── package.json
    ├── app/                  # React Router v7
    │   ├── app/
    │   │   ├── routes/       # File-based routes
    │   │   └── entry.client.tsx
    │   ├── package.json
    │   └── vite.config.ts
    └── shared/               # Shared types
        ├── src/
        │   └── index.ts
        ├── dist/             # Compiled output (tsup)
        └── package.json
```

### Reference Projects
- **Elena backend:** `/Users/leobar37/code/elena/packages/backend/` - Elysia + Drizzle patterns
- **Elena shared:** `/Users/leobar37/code/elena/packages/shared/` - tsup build setup
- **Elena app:** `/Users/leobar37/code/elena/packages/app/` - React Router v7 structure

---

## Work Objectives

### Core Objective
Establish a solid technical foundation so subsequent phases (1-5) can build features on top of a working monorepo with proper tooling, build system, and documentation.

### Concrete Deliverables
1. **Monorepo infrastructure** - Bun workspaces, Turborepo pipelines
2. **Backend service** - ElysiaJS server with Neon PostgreSQL connection
3. **Frontend app** - React Router v7 SPA with hot reload
4. **Shared package** - TypeScript types compiled with tsup (dist/index.js + dist/index.d.ts)
5. **Database configuration** - Drizzle ORM configured for Neon (DATABASE_URL with SSL)
6. **Documentation** - README.md for humans, AGENTS.md for AI agents
7. **Scripts** - `dev`, `build`, `db:migrate` working from root

### Definition of Done
- [x] `bun install` works on a clean machine
- [x] `bun run dev` starts backend (port 3000) and app (port 5173)
- [x] Hot reload works in both packages
- [x] `bun run build` succeeds (shared compiles first, then backend/app)
- [x] `packages/shared/dist/` contains `index.js` and `index.d.ts`
- [x] `README.md` exists with setup instructions
- [x] `AGENTS.md` exists with patterns for AI agents
- [x] Backend connects to Neon PostgreSQL (connection test passes)
- [x] No business logic (only infrastructure code)

### Must Have
- Bun workspaces configured correctly
- Turborepo pipelines for dev and build
- TypeScript strict mode in all packages
- Drizzle ORM configured for Neon PostgreSQL with SSL
- Shared package builds with tsup (ESM + DTS outputs)
- Elena-inspired folder structure
- README.md with clear setup instructions
- AGENTS.md with actionable patterns for AI agents

### Must NOT Have (Guardrails)
- NO business logic (auth, sales, customers, etc.) - that's for phases 1-5
- NO PollosPro-specific UI - generic setup only
- NO TanStack DB configuration - Phase 2
- NO Better Auth implementation - Phase 1
- NO tests in this phase - Phase 5
- NO Docker Compose - we use Neon PostgreSQL
- NO deployment configuration

---

## Verification Strategy

### Testing Strategy
- **Tests in this phase:** NO
- **Test infrastructure:** Will be added in Phase 5 (Admin)
- **Verification method:** Agent-executed QA scenarios

### Agent-Executed QA Scenarios

#### Scenario 1: Clean Installation
```yaml
Tool: Bash
Preconditions: Bun 1.1.38+ installed, clean directory
Steps:
  1. cd /Users/leobar37/code/avileo
  2. rm -rf node_modules packages/*/node_modules bun.lock
  3. bun install
  4. Verify: bun.lock created
  5. Verify: node_modules/ exists in root
  6. Verify: node_modules/ exists in packages/*/
Expected Result: Installation completes without errors
Evidence: Terminal output showing successful install
```

#### Scenario 2: Backend Development Server
```yaml
Tool: interactive_bash (tmux)
Preconditions: Dependencies installed, DATABASE_URL configured
Steps:
  1. cd packages/backend
  2. bun run dev
  3. Wait for: "Server running at http://localhost:3000"
  4. In another terminal: curl http://localhost:3000/health
  5. Assert: HTTP 200, body contains status
  6. Modify src/index.ts
  7. Assert: Hot reload detects change (server restarts)
  8. Send: Ctrl+C to stop
Expected Result: Server starts, responds to health check, hot reload works
Evidence: 
  - Screenshot of server startup message
  - curl response output
  - Hot reload log message
```

#### Scenario 3: Frontend Development Server
```yaml
Tool: interactive_bash (tmux)
Preconditions: Dependencies installed
Steps:
  1. cd packages/app
  2. bun run dev
  3. Wait for: "Local: http://localhost:5173/"
  4. In another terminal: curl http://localhost:5173
  5. Assert: HTTP 200, response contains HTML
  6. Modify app/routes/_index.tsx
  7. Assert: Vite HMR updates the page
  8. Send: Ctrl+C to stop
Expected Result: App starts, serves HTML, hot reload works
Evidence:
  - Screenshot of Vite dev server output
  - curl HTML response (first 500 chars)
  - HMR update message in terminal
```

#### Scenario 4: Shared Package Build
```yaml
Tool: Bash
Preconditions: Dependencies installed
Steps:
  1. cd packages/shared
  2. bun run build
  3. Assert: No build errors
  4. Assert: dist/index.js exists
  5. Assert: dist/index.d.ts exists
  6. Assert: dist/index.js is ESM format (contains "export")
  7. cat dist/index.d.ts | head -20
Expected Result: tsup generates compiled JS and type definitions
Evidence:
  - Build output showing success
  - ls -la dist/ showing files
  - First 20 lines of index.d.ts
```

#### Scenario 5: Full Production Build
```yaml
Tool: Bash
Preconditions: All dependencies installed
Steps:
  1. cd /Users/leobar37/code/avileo
  2. bun run build
  3. Assert: Build order: shared → backend, shared → app
  4. Assert: packages/shared/dist/ exists with .js and .d.ts
  5. Assert: packages/backend/dist/ exists (if building backend)
  6. Assert: packages/app/build/ or dist/ exists
  7. Assert: No build errors in output
Expected Result: All packages build successfully in correct order
Evidence:
  - Full build log
  - Directory listings of dist/ folders
```

#### Scenario 6: Documentation Files Exist
```yaml
Tool: Bash
Steps:
  1. cat /Users/leobar37/code/avileo/README.md
  2. Assert: Contains project title
  3. Assert: Contains setup instructions
  4. Assert: Contains structure overview
  5. cat /Users/leobar37/code/avileo/AGENTS.md
  6. Assert: Contains available skills
  7. Assert: Contains conventions
  8. Assert: Contains stack information
Expected Result: Both documentation files exist and have required content
Evidence:
  - README.md first 50 lines
  - AGENTS.md first 50 lines
```

#### Scenario 7: Neon Database Connection
```yaml
Tool: Bash
Preconditions: DATABASE_URL set in .env
Steps:
  1. cd packages/backend
  2. Create test script: cat > test-db.ts << 'EOF'
     import { db } from './src/lib/db';
     const result = await db.execute('SELECT 1 as test');
     console.log('DB Connection:', result);
     EOF
  3. bun run test-db.ts
  4. Assert: Output shows successful connection
  5. rm test-db.ts
Expected Result: Backend can connect to Neon PostgreSQL
Evidence:
  - Database connection test output
  - Error message if connection fails
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Start Immediately):
├── TODO 1: Create monorepo root structure
│   └── Output: package.json, turbo.json, .gitignore, .env.example
├── TODO 2: Create shared package with tsup
│   └── Output: packages/shared/ with build setup
└── TODO 3: Create backend with Neon config
    └── Output: packages/backend/ with Elysia + Drizzle

Wave 2 (Frontend - After Wave 1 completes):
├── TODO 4: Create React Router v7 app
│   └── Output: packages/app/ with Vite + routing
└── TODO 5: Configure Turborepo pipelines
    └── Output: turbo.json with dev/build pipelines

Wave 3 (Documentation - After Wave 2):
├── TODO 6: Create README.md
│   └── Output: Human-readable setup guide
├── TODO 7: Create AGENTS.md
│   └── Output: AI agent conventions
└── TODO 8: Final integration verification
    └── Output: All QA scenarios pass
```

### Dependency Matrix

| TODO | Depends On | Blocks | Parallelizable |
|------|------------|--------|----------------|
| 1 | None | 2, 3 | NO |
| 2 | 1 | 4 | YES (with 3) |
| 3 | 1 | 5 | YES (with 2) |
| 4 | 2, 3 | 5 | NO |
| 5 | 4 | 6, 7 | NO |
| 6 | 5 | 8 | YES (with 7) |
| 7 | 5 | 8 | YES (with 6) |
| 8 | 6, 7 | None | NO |

---

## TODOs

- [x] 1. Create monorepo root structure

  **What to do:**
  1. Create `package.json` at project root with:
     - `"name": "avileo"`
     - `"private": true`
     - `"workspaces": ["packages/*"]`
     - `"packageManager": "bun@1.1.38"`
     - Scripts: `dev`, `build`, `db:migrate`, `db:generate`
     - Dev dependencies: `turbo`, `typescript`
  2. Create `turbo.json` with pipelines:
     - `dev`: `{ "cache": false, "persistent": true }`
     - `build`: `{ "dependsOn": ["^build"], "outputs": ["dist/**", "build/**"] }`
     - `db:migrate`: `{ "cache": false }`
  3. Create `.gitignore` for Bun/Node projects
  4. Create `.env.example` with:
     - `DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"`
     - `JWT_SECRET="min-32-characters-secret-key"`
  5. Verify structure with `ls -la`

  **Must NOT do:**
  - Do not install dependencies yet
  - Do not create docker-compose.yml (we use Neon)
  - Do not add business logic

  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `fullstack-infrastructure`
  - **Why:** Monorepo setup is infrastructure/configuration work

  **Parallelization:**
  - Can Run In Parallel: NO (foundation task)
  - Blocks: TODO 2, TODO 3

  **References:**
  - Elena root package.json: `/Users/leobar37/code/elena/package.json`
  - Elena turbo.json: `/Users/leobar37/code/elena/turbo.json`
  - Bun workspaces: https://bun.sh/docs/install/workspaces
  - Turborepo docs: https://turbo.build/repo/docs

  **Acceptance Criteria:**
  - [ ] `package.json` exists with workspaces configured
  - [ ] `turbo.json` has dev and build pipelines
  - [ ] `.env.example` includes DATABASE_URL format for Neon
  - [ ] `.gitignore` ignores node_modules, dist, build

  **Agent-Executed Verification:**
  ```bash
  cd /Users/leobar37/code/avileo
  ls -la package.json turbo.json .env.example .gitignore
  cat package.json | grep -A 5 '"workspaces"'
  cat turbo.json | grep -A 3 '"dev"'
  ```

  **Evidence to Capture:**
  - [ ] Screenshot of directory listing
  - [ ] Content of package.json workspaces section
  - [ ] Content of turbo.json pipelines

  **Commit:** YES
  - Message: `chore(setup): initialize bun monorepo with turborepo`
  - Files: `package.json`, `turbo.json`, `.gitignore`, `.env.example`

---

- [x] 2. Create shared package with tsup build

  **What to do:**
  1. Create directory `packages/shared/`
  2. Create `packages/shared/package.json`:
     - `"name": "@avileo/shared"`
     - `"version": "0.0.1"`
     - `"type": "module"`
     - `"main": "./dist/index.js"`
     - `"types": "./dist/index.d.ts"`
     - `"files": ["dist"]`
     - Scripts: `"build": "tsup src/index.ts --format esm --dts --out-dir dist"`
     - Dev dependencies: `tsup`, `typescript`
  3. Create `packages/shared/tsconfig.json` with strict TypeScript config
  4. Create `packages/shared/src/index.ts` with placeholder exports
  5. Verify build works: `cd packages/shared && bun install && bun run build`
  6. Verify dist/ contains index.js and index.d.ts

  **Must NOT do:**
  - Do not define complete business types (will add in later phases)
  - Do not implement complex utilities
  - Do not add tests

  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `fullstack-infrastructure`
  - **Why:** Package setup and build configuration

  **Parallelization:**
  - Can Run In Parallel: YES (with TODO 3)
  - Blocked By: TODO 1
  - Blocks: TODO 4 (backend and app need shared)

  **References:**
  - Elena shared package.json: `/Users/leobar37/code/elena/packages/shared/package.json`
  - Elena shared tsconfig: `/Users/leobar37/code/elena/packages/shared/tsconfig.json`
  - tsup docs: https://tsup.egoist.dev/

  **Acceptance Criteria:**
  - [ ] `packages/shared/package.json` exists with build script
  - [ ] `packages/shared/src/index.ts` exists
  - [ ] `bun run build` generates `dist/index.js` (ESM)
  - [ ] `bun run build` generates `dist/index.d.ts` (types)
  - [ ] Other packages can import with `@avileo/shared`

  **Agent-Executed Verification:**
  ```bash
  cd packages/shared
  bun install
  bun run build
  ls -la dist/
  head -5 dist/index.js
  head -5 dist/index.d.ts
  ```

  **Evidence to Capture:**
  - [ ] Build output showing success
  - [ ] ls of dist/ directory
  - [ ] First lines of compiled files

  **Commit:** YES
  - Message: `chore(shared): create shared package with tsup build`
  - Files: `packages/shared/**/*`

---

- [x] 3. Create backend with ElysiaJS and Neon PostgreSQL

  **What to do:**
  1. Create directory `packages/backend/`
  2. Create `packages/backend/package.json`:
     - Dependencies: `elysia`, `drizzle-orm`, `postgres`, `@avileo/shared`
     - Dev dependencies: `drizzle-kit`, `typescript`, `@types/bun`
     - Scripts: `dev`, `build`, `db:generate`, `db:migrate`, `db:push`
  3. Create `packages/backend/tsconfig.json`
  4. Create `packages/backend/src/index.ts`:
     - Initialize Elysia server
     - Configure port 3000
     - Add health check endpoint: `GET /health`
     - Add CORS if needed for frontend
  5. Create `packages/backend/src/lib/db.ts`:
     - Import `postgres` driver
     - Import `drizzle` from `drizzle-orm/postgres-js`
     - Use `process.env.DATABASE_URL` (Neon connection string)
     - Configure SSL (required by Neon): `ssl: true`
     - Export `db` instance
  6. Create `packages/backend/drizzle.config.ts`:
     - Configure dialect: "postgresql"
     - Configure schema path
     - Configure dbCredentials with connection string
  7. Add `.env` file with DATABASE_URL (from .env.example)
  8. Test: `bun run dev` should start server on :3000
  9. Test: `curl http://localhost:3000/health` should return 200

  **Must NOT do:**
  - Do not create database schemas yet (tables, migrations)
  - Do not implement authentication (Phase 1)
  - Do not create business routers (sales, customers)
  - Do not add tests

  **Recommended Agent Profile:**
  - **Category:** `unspecified-high` - Technical setup requiring decisions
  - **Skills:** `bun-elysia`, `fullstack-backend`
  - **Why:** Elysia patterns and backend architecture

  **Parallelization:**
  - Can Run In Parallel: YES (with TODO 2)
  - Blocked By: TODO 1
  - Blocks: TODO 5, TODO 6, TODO 7

  **References:**
  - Elena backend: `/Users/leobar37/code/elena/packages/backend/src/index.ts`
  - Elena drizzle config: `/Users/leobar37/code/elena/packages/backend/drizzle.config.ts`
  - Neon + Drizzle: https://orm.drizzle.team/docs/get-started-postgresql#neon
  - Elysia docs: https://elysiajs.com/quick-start.html

  **Acceptance Criteria:**
  - [ ] `bun run dev` starts server on port 3000
  - [ ] Endpoint `GET /health` returns HTTP 200 with JSON
  - [ ] Hot reload works (changes restart server)
  - [ ] Drizzle config exists and is valid
  - [ ] Database connection uses SSL (Neon requirement)
  - [ ] Can import from `@avileo/shared`

  **Agent-Executed Verification:**
  ```bash
  cd packages/backend
  bun install
  # In one terminal:
  bun run dev &
  sleep 3
  # In another terminal:
  curl -s http://localhost:3000/health | jq .
  # Test hot reload:
  echo "// test" >> src/index.ts
  # Should see restart in logs
  kill %1
  ```

  **Evidence to Capture:**
  - [ ] Server startup message
  - [ ] Health check response
  - [ ] Hot reload log message

  **Commit:** YES
  - Message: `feat(backend): setup Elysia server with Drizzle ORM for Neon PostgreSQL`
  - Files: `packages/backend/**/*`

---

- [x] 4. Create React Router v7 frontend app

  **What to do:**
  1. Create directory `packages/app/`
  2. Create `packages/app/package.json`:
     - Dependencies: `react`, `react-dom`, `@react-router/node`, `@react-router/serve`, `vite`, `@avileo/shared`
     - Dev dependencies: `@react-router/dev`, `typescript`, `@types/react`, `@types/react-dom`
     - Scripts: `dev`, `build`, `start`, `typecheck`
  3. Create `packages/app/tsconfig.json`
  4. Create `packages/app/vite.config.ts` with React Router plugin
  5. Create `packages/app/react-router.config.ts` with appDirectory
  6. Create `packages/app/app/entry.client.tsx` - Client entry point
  7. Create `packages/app/app/root.tsx` - Root layout
  8. Create `packages/app/app/routes/_index.tsx` - Home route with basic content
  9. Configure path alias `@/` in vite.config.ts and tsconfig.json
  10. Add `.env` file if needed
  11. Test: `bun run dev` should start on :5173
  12. Test: `curl http://localhost:5173` should return HTML
  13. Test hot reload: modify route file, verify HMR updates

  **Must NOT do:**
  - Do not create business pages (login, sales dashboard)
  - Do not implement complex routing
  - Do not configure TanStack DB yet (Phase 2)
  - Do not add tests

  **Recommended Agent Profile:**
  - **Category:** `visual-engineering` - Frontend configuration
  - **Skills:** `fullstack-infrastructure`, `frontend`
  - **Why:** React Router v7 setup and Vite configuration

  **Parallelization:**
  - Can Run In Parallel: NO
  - Blocked By: TODO 2 (shared), TODO 3 (backend)
  - Blocks: TODO 5, TODO 6, TODO 7

  **References:**
  - Elena app: `/Users/leobar37/code/elena/packages/app/`
  - Elena vite config: `/Users/leobar37/code/elena/packages/app/vite.config.ts`
  - React Router v7 docs: https://reactrouter.com/start/framework/installation
  - Vite docs: https://vitejs.dev/guide/

  **Acceptance Criteria:**
  - [ ] `bun run dev` starts app on port 5173
  - [ ] Route `/` displays basic content
  - [ ] Hot reload works (Vite HMR updates page)
  - [ ] Imports with `@/` work correctly
  - [ ] React Router v7 file-based routing is configured
  - [ ] Can import from `@avileo/shared`

  **Agent-Executed Verification:**
  ```bash
  cd packages/app
  bun install
  # In one terminal:
  bun run dev &
  sleep 5
  # In another terminal:
  curl -s http://localhost:5173 | head -20
  # Test hot reload:
  echo "console.log('test')" >> app/routes/_index.tsx
  # Check terminal for HMR message
  kill %1
  ```

  **Evidence to Capture:**
  - [ ] Vite dev server startup message
  - [ ] HTML response from curl
  - [ ] HMR update message

  **Commit:** YES
  - Message: `feat(app): setup React Router v7 with Vite`
  - Files: `packages/app/**/*`

---

- [x] 5. Configure Turborepo pipelines and workspace dependencies

  **What to do:**
  1. Update root `package.json` scripts:
     - `"dev": "turbo dev"`
     - `"build": "turbo build"`
     - `"db:migrate": "turbo db:migrate"`
  2. Update `turbo.json` with task dependencies:
     - `@avileo/backend#build` depends on `@avileo/shared#build`
     - `@avileo/app#build` depends on `@avileo/shared#build`
     - Build outputs configured for each package
  3. Verify workspace protocol in backend and app package.json:
     - `"@avileo/shared": "workspace:*"`
  4. Test: `bun run build` from root should:
     - Build shared first
     - Then build backend and app in parallel
  5. Test: `bun run dev` from root should start both servers

  **Must NOT do:**
  - Do not add test pipeline (no tests in Phase 0)
  - Do not overcomplicate dependencies
  - Do not add unnecessary caching to dev tasks

  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `fullstack-infrastructure`
  - **Why:** Turborepo configuration

  **Parallelization:**
  - Can Run In Parallel: NO
  - Blocked By: TODO 3, TODO 4
  - Blocks: TODO 6, TODO 7

  **References:**
  - Elena turbo.json: `/Users/leobar37/code/elena/turbo.json`
  - Turborepo docs: https://turbo.build/repo/docs/reference/configuration

  **Acceptance Criteria:**
  - [ ] `turbo.json` has dev and build pipelines
  - [ ] `bun run dev` from root starts both backend and app
  - [ ] `bun run build` compiles in correct order (shared first)
  - [ ] Workspace dependencies use `workspace:*` protocol
  - [ ] Build outputs are cached appropriately

  **Agent-Executed Verification:**
  ```bash
  cd /Users/leobar37/code/avileo
  # Test build order:
  bun run build 2>&1 | tee build.log
  grep -E "(shared|backend|app)" build.log
  # Verify shared builds before others
  ```

  **Evidence to Capture:**
  - [ ] turbo.json content
  - [ ] Build log showing execution order
  - [ ] Both servers running from root dev command

  **Commit:** YES
  - Message: `chore(turbo): configure pipelines with workspace dependencies`
  - Files: `turbo.json`, root `package.json`

---

- [x] 6. Create README.md for humans

  **What to do:**
  1. Create `README.md` in project root
  2. Include sections:
     - **Title and description** - Avileo/PollosPro description
     - **Requirements** - Bun 1.1.38+, Node 20+ (for some tools)
     - **Quick Start** - Commands to get started:
       ```bash
       bun install
       cp .env.example .env
       # Add your Neon DATABASE_URL
       bun run dev
       ```
     - **Project Structure** - Brief overview of packages/
     - **Available Scripts** - List of root scripts (dev, build, db:migrate)
     - **Documentation** - Link to `/docs/` for detailed docs
  3. Keep it concise and actionable
  4. Format with clear markdown
  5. Verify: `cat README.md` shows complete content

  **Must NOT do:**
  - Do not include outdated information
  - Do not duplicate extensive documentation from `/docs/`
  - Do not include AI agent instructions (that's AGENTS.md)
  - Do not include internal implementation details

  **Recommended Agent Profile:**
  - **Category:** `writing`
  - **Skills:** []
  - **Why:** Documentation writing

  **Parallelization:**
  - Can Run In Parallel: YES (with TODO 7)
  - Blocked By: TODO 5
  - Blocks: TODO 8

  **References:**
  - Elena README: `/Users/leobar37/code/elena/README.md`
  - Good README guide: https://www.makeareadme.com/

  **Acceptance Criteria:**
  - [ ] `README.md` exists in root
  - [ ] Has title and project description
  - [ ] Has requirements section
  - [ ] Has quick start with commands
  - [ ] Mentions project structure
  - [ ] Links to `/docs/` directory
  - [ ] Is human-readable and actionable

  **Agent-Executed Verification:**
  ```bash
  cat /Users/leobar37/code/avileo/README.md
  # Verify all sections exist
  grep -E "^(#|##)" README.md
  ```

  **Evidence to Capture:**
  - [ ] Full README.md content
  - [ ] Section headers listing

  **Commit:** YES
  - Message: `docs: add README with setup instructions and project overview`
  - Files: `README.md`

---

- [x] 7. Create AGENTS.md for AI agents

  **What to do:**
  1. Create `AGENTS.md` in project root
  2. Include sections:
     - **Available Skills** - Skills that can be invoked:
       - `skill(name="bun-elysia")` - Backend patterns
       - `skill(name="frontend")` - React/TanStack patterns
       - `skill(name="fullstack-infrastructure")` - Monorepo patterns
     - **Project Conventions**:
       - Backend code in `packages/backend/src/`
       - Frontend routes in `packages/app/app/routes/`
       - Shared types in `packages/shared/src/`
       - Database: Neon PostgreSQL with Drizzle ORM
       - Workspace imports: use `@avileo/shared`
     - **Architecture Decisions**:
       - Monorepo: Bun + Turborepo
       - Offline-first with TanStack DB (Phase 2)
       - Stack: Bun, Elysia, Drizzle, React Router v7, TanStack
     - **Common Patterns**:
       - How to add a new API route
       - How to add a new frontend route
       - How to add shared types
  3. Keep it concise and actionable
  4. NO fluff or unnecessary information
  5. Verify: `cat AGENTS.md` shows complete content

  **Must NOT do:**
  - Do not include "trash" or irrelevant information
  - Do not duplicate extensive documentation
  - Do not include human setup instructions (that's README.md)
  - Do not include information that won't help agents make decisions

  **Recommended Agent Profile:**
  - **Category:** `writing`
  - **Skills:** []
  - **Why:** Technical documentation for AI

  **Parallelization:**
  - Can Run In Parallel: YES (with TODO 6)
  - Blocked By: TODO 5
  - Blocks: TODO 8

  **References:**
  - Elena AGENTS.md: `/Users/leobar37/code/elena/AGENTS.md`

  **Acceptance Criteria:**
  - [ ] `AGENTS.md` exists in root
  - [ ] Lists available skills
  - [ ] Documents key conventions
  - [ ] Mentions stack and architecture
  - [ ] Includes common patterns
  - [ ] Is actionable and concise

  **Agent-Executed Verification:**
  ```bash
  cat /Users/leobar37/code/avileo/AGENTS.md
  # Verify all sections exist
  grep -E "^(#|##)" AGENTS.md
  ```

  **Evidence to Capture:**
  - [ ] Full AGENTS.md content
  - [ ] Section headers listing

  **Commit:** YES
  - Message: `docs: add AGENTS.md with patterns and conventions for AI agents`
  - Files: `AGENTS.md`

---

- [x] 8. Final integration verification

  **What to do:**
  1. Run complete verification sequence:
     ```bash
     # Clean start
     cd /Users/leobar37/code/avileo
     rm -rf node_modules packages/*/node_modules bun.lock
     
     # Install
     bun install
     
     # Build (should compile shared first)
     bun run build
     
     # Start dev servers
     bun run dev
     ```
  2. Verify all QA scenarios pass:
     - Scenario 1: Clean installation ✓
     - Scenario 2: Backend server ✓
     - Scenario 3: Frontend server ✓
     - Scenario 4: Shared build ✓
     - Scenario 5: Full production build ✓
     - Scenario 6: Documentation files ✓
     - Scenario 7: Neon connection ✓
  3. Verify documentation:
     - README.md is helpful
     - AGENTS.md is actionable
  4. Document any issues found
  5. Fix any critical issues

  **Must NOT do:**
  - Do not add new features
  - Do not modify configuration if everything works
  - Do not skip verification steps

  **Recommended Agent Profile:**
  - **Category:** `unspecified-low` - Verification work
  - **Skills:** `qamanual`
  - **Why:** Manual QA verification

  **Parallelization:**
  - Can Run In Parallel: NO (final task)
  - Blocked By: TODO 6, TODO 7

  **Acceptance Criteria:**
  - [ ] All 7 QA scenarios pass
  - [ ] Clean installation works
  - [ ] Both dev servers start and respond
  - [ ] Hot reload works in both
  - [ ] Production build succeeds
  - [ ] Shared package compiles correctly
  - [ ] Documentation files exist and are useful
  - [ ] No business logic in codebase

  **Agent-Executed Verification:**
  ```bash
  # Run all scenarios
  cd /Users/leobar37/code/avileo
  
  # Scenario 1
  rm -rf node_modules packages/*/node_modules bun.lock
  bun install
  
  # Scenario 4 (shared build)
  cd packages/shared && bun run build && cd ../..
  
  # Scenario 5 (full build)
  bun run build
  
  # Check documentation
  ls -la README.md AGENTS.md
  ```

  **Evidence to Capture:**
  - [ ] All scenario results
  - [ ] Final directory listing
  - [ ] Any issues found

  **Commit:** NO (verification only, no code changes)

---

## Commit Strategy

| After Task | Commit Message | Files |
|------------|----------------|-------|
| 1 | `chore(setup): initialize bun monorepo with turborepo` | `package.json`, `turbo.json`, `.gitignore`, `.env.example` |
| 2 | `chore(shared): create shared package with tsup build` | `packages/shared/**/*` |
| 3 | `feat(backend): setup Elysia server with Drizzle ORM for Neon PostgreSQL` | `packages/backend/**/*` |
| 4 | `feat(app): setup React Router v7 with Vite` | `packages/app/**/*` |
| 5 | `chore(turbo): configure pipelines with workspace dependencies` | `turbo.json`, root `package.json` |
| 6 | `docs: add README with setup instructions and project overview` | `README.md` |
| 7 | `docs: add AGENTS.md with patterns and conventions for AI agents` | `AGENTS.md` |

---

## Success Criteria

### Verification Checklist

Run these commands to verify the setup:

```bash
# 1. Clean installation
cd /Users/leobar37/code/avileo
rm -rf node_modules packages/*/node_modules bun.lock
bun install

# 2. Build shared package (must succeed first)
cd packages/shared && bun run build
cd ../..

# 3. Full production build (correct order: shared → backend/app)
bun run build

# 4. Development (two terminals)
# Terminal 1:
cd packages/backend && bun run dev  # http://localhost:3000
# Terminal 2:
cd packages/app && bun run dev      # http://localhost:5173

# 5. Verify documentation
cat README.md
cat AGENTS.md
```

### Final Checklist
- [x] `bun install` works on clean machine
- [x] `bun run dev` starts backend on port 3000
- [x] `bun run dev` starts app on port 5173
- [x] Hot reload works in both packages
- [x] Production build succeeds
- [x] Shared package outputs dist/index.js and dist/index.d.ts
- [x] Build order is correct: shared first, then backend/app
- [x] Backend connects to Neon PostgreSQL
- [x] README.md exists with setup instructions
- [x] AGENTS.md exists with AI patterns
- [x] No business logic in codebase
- [x] No Docker Compose configuration
- [x] No tests (will add in Phase 5)

---

## Next Steps

After completing this plan:
1. Execute Phase 1: Authentication (Better Auth setup)
2. Execute Phase 2: Core Offline (TanStack DB)
3. Continue with Phases 3-5

**To start Phase 1:**
```bash
/start-work .sisyphus/plans/avileo-phase-1-auth.md
```

---

*Phase 0: SETUP - Technical foundation for Avileo*

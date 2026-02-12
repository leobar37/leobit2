# Architecture Guide - Avileo

> **Multi-skill workflows, decision matrices, and architectural patterns.**
> For project overview, see `../AGENTS.md`. For technical specs, see `technical/readme.md`.

---

## Available Skills

### 1. fullstack-backend
**Domain**: Backend architecture, Drizzle ORM, layered patterns
**Use when**:
- Database setup and schema design
- Creating repositories and business services
- Setting up Elysia with dependency injection
- Implementing RequestContext for multi-tenancy
- Writing database queries with Drizzle
- Setting up error handling

**Keywords**: drizzle, database, schema, repository, service layer, elysia, backend, pgTable, queries

### 2. fullstack-inngest
**Domain**: Background jobs and event-driven architecture
**Use when**:
- Creating background jobs
- Setting up scheduled tasks (cron)
- Event-driven workflows
- Async processing
- Step functions and retries

**Keywords**: background job, async, queue, event, cron, scheduled, workflow, inngest, step

### 3. fullstack-auth-better
**Domain**: Authentication and authorization with Better Auth
**Use when**:
- Setting up authentication
- JWT sessions and Bearer tokens
- Protected routes
- RBAC (Role-Based Access Control)
- API middleware for auth

**Keywords**: auth, authentication, login, jwt, session, rbac, permissions, protected routes, better auth

### 4. fullstack-infrastructure
**Domain**: Project setup and infrastructure
**Use when**:
- Initial project setup
- Bun monorepo configuration
- Turborepo pipeline setup
- React Router v7 configuration
- File-based routing
- Server-Sent Events (SSE)

**Keywords**: setup, monorepo, turborepo, react router, routing, bun workspaces, sse, infrastructure, project structure

### 5. frontend
**Domain**: React frontend architecture and UI components
**Use when**:
- Building React UI components
- Creating forms with validation
- Implementing modals and drawers
- Responsive layouts and tables
- shadcn/ui components
- State management (MobX, Jotai)
- Data fetching with TanStack Query

**Keywords**: react, component, form, modal, drawer, table, responsive, layout, shadcn, tailwind, mobx, query

---

## Decision Matrix

| User Request | Skill(s) to Use | Priority |
|-------------|-----------------|----------|
| "Setup database" / "Create tables" / "Drizzle" | fullstack-backend | 1 |
| "Background job" / "Async task" / "Cron" | fullstack-inngest | 1 |
| "Authentication" / "Login" / "RBAC" / "JWT" | fullstack-auth-better | 1 |
| "Setup project" / "Monorepo" / "React Router" | fullstack-infrastructure | 1 |
| "React component" / "Form" / "Modal" / "UI" | frontend | 1 |
| "Full-stack app from scratch" | All skills in sequence | - |
| "API with auth and database" | fullstack-backend + fullstack-auth-better | - |
| "Background jobs with auth" | fullstack-inngest + fullstack-auth-better | - |
| "Dashboard with tables" | frontend + fullstack-backend | - |

---

## Process

1. **ANALYZE**: Read the user's request carefully and identify:
   - What domain does this belong to? (backend, jobs, auth, infra)
   - Is it a single task or multi-step?
   - Which skill(s) are most relevant?

2. **SELECT**: Choose the appropriate skill(s):
   - For single-domain tasks: Use one skill
   - For multi-domain tasks: Chain multiple skills
   - If unsure: Ask clarifying questions

3. **EXECUTE**: Use the selected skill(s):
   - Load the skill by mentioning it
   - Follow the patterns in the skill
   - Apply the code examples

4. **COORDINATE**: If multiple skills needed:
   - Run them in logical order
   - Pass context between steps
   - Ensure consistency

5. **REPORT**: Summarize what was done:
   - Which skill(s) were used
   - What patterns were applied
   - Any next steps or recommendations

---

## Multi-Skill Workflows

### New Full-Stack Project
1. fullstack-infrastructure (setup monorepo + RR7)
2. fullstack-backend (setup Drizzle)
3. fullstack-auth-better (setup auth)
4. fullstack-inngest (setup jobs if needed)

### API with Database + Auth
1. fullstack-backend (repositories + services)
2. fullstack-auth-better (protected routes)

### Background Jobs with Notifications
1. fullstack-inngest (job definition)
2. fullstack-backend (if DB access needed)

### Dashboard with Forms and Tables
1. fullstack-backend (API endpoints)
2. frontend (forms, tables, modals)
3. fullstack-auth-better (protected routes)

### Complete Full-Stack Feature
1. fullstack-backend (database + API)
2. fullstack-auth-better (auth)
3. frontend (UI components)
4. fullstack-inngest (background tasks)

---

## Examples

**User**: "Necesito configurar la base de datos"
**Response**: Uses fullstack-backend → patterns/05-drizzle-schema.md

**User**: "Setup de proyecto con autenticación"
**Response**: 
1. fullstack-infrastructure (project structure)
2. fullstack-auth-better (auth setup)

**User**: "Background jobs para enviar emails"
**Response**: Uses fullstack-inngest → patterns/02-defining-functions.md

**User**: "Crear un formulario con validación"
**Response**: Uses frontend → patterns/create-modal.md + patterns/forms.md

**User**: "Dashboard con tabla de datos"
**Response**: 
1. fullstack-backend (API para datos)
2. frontend (DataTable component)

---

## Rules

- ALWAYS check which skill is most relevant before starting
- CAN invoke multiple skills for complex tasks
- EXPLAIN your reasoning when selecting skills
- NEVER make up functionality - only use available skills
- ASK clarifying questions if the request is ambiguous
- VERIFY file paths match the project's structure
- FOLLOW existing patterns if found in the codebase

---

## Important Notes

- All skills assume Bun as runtime
- Backend uses Elysia framework
- Database uses PostgreSQL with Drizzle ORM
- Frontend uses React Router v7
- Authentication uses Better Auth
- Background jobs use Inngest

When in doubt, prefer asking the user for clarification over making assumptions.

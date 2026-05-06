# CocheraPro Initiative Context

## Initiative Summary

CocheraPro adds a new Avileo business vertical for small Peruvian parking garages that want to replace paper registers with a responsive web workflow: register vehicle entry by plate, calculate checkout charges automatically, track daily/monthly income, configure parking rates, generate reports, and enforce Free/Professional subscription limits.

## Product Decisions Captured

- `cochera` will be a separate `businessMode`, following the existing `agua` vertical pattern.
- CocheraPro is online-only for this initiative; it should not introduce PGlite, sync queues, or offline-first mutation paths.
- Subscription support is included now: Free and Professional plans with tenant-scoped limits.
- User-facing copy should be Spanish for Peru (`es-PE`); code comments remain English.

## Verified Context

### Business Modes

- Business verticals are represented by `businessMode` in `businesses.business_mode`.
- Shared business mode contracts live under `packages/shared/src/business-modes/`.
- Current shared mode types and defaults support `polleria` and `agua`; `cochera` must be added before any feature can be safely exposed.
- Frontend business creation currently offers existing business modes from route/UI code.
- Backend request context resolves `businessMode` and mode flags for tenant-aware behavior.

### Backend Architecture

- Routes are mounted in `packages/backend/src/app.ts`.
- Route modules use Elysia, `contextPlugin`, `servicesPlugin`, and `t.Object` validation.
- Domain logic belongs in `packages/backend/src/services/business/`.
- Data access belongs in `packages/backend/src/services/repository/`.
- Tenant-scoped queries must use `ctx.businessId`.
- Service and repository methods should accept `ctx` as the first argument.
- Backend schema exports are centralized in `packages/backend/src/db/schema/index.ts`.

### Frontend Architecture

- Frontend uses React Router v7 flat routes under `packages/app/app/routes/`.
- Protected pages render through the shared app shell in `_protected.tsx`.
- Data access should be wrapped in TanStack Query hooks under `packages/app/app/hooks/`.
- Operational mobile screens should follow the established summary/search/list/FAB pattern.

### Shared Contracts

- Shared API-facing types and constants are exported from `packages/shared/src/index.ts`.
- Shared Drizzle-compatible schema currently includes cross-package tables and inferred types in `packages/shared/src/schema.ts`.
- Existing `Business` and create/update business input types must be widened to include `cochera`.

### Existing Vertical Pattern

- The `agua` vertical uses dedicated extension tables, shared contracts, backend services, and mode-aware frontend labels/routes.
- CocheraPro should follow the dedicated-table approach rather than forcing parking sessions into the existing sales/product model.

## Scope Boundaries

### In Scope

- `cochera` business mode support.
- Tenant-scoped CocheraPro schema/API/services.
- Parking garage settings: name/address, hourly/day rate, grace minutes, capacity, accepted payment methods.
- Vehicle entry/session registration and active occupancy list.
- Checkout/payment calculation with hourly ceiling and optional discount.
- Dashboard KPIs and 7-day income chart.
- Reports by today/week/month and export capability.
- Free/Professional subscription model and limits.
- Auth/onboarding wiring for CocheraPro businesses.
- Seeds/fixtures/QA coverage planning.

### Out of Scope

- Abonados/monthly customers.
- Shift-based cash control.
- SUNAT electronic invoicing.
- License plate recognition.
- Hardware gate/barrier integrations.
- Native mobile apps.
- Valet parking.
- Per-minute billing.
- Printed tickets.
- Offline/PGlite sync for CocheraPro.

## Assumptions

- Plate is mandatory and normalized to uppercase.
- Only one active `dentro` session per plate per business is allowed.
- Payment methods are limited to `efectivo`, `yape`, and `plin` for MVP.
- Free-plan monthly limits apply to completed parking transactions unless later changed.
- Excel export can be planned as an export feature; implementation may choose CSV or XLSX during `/plan` based on existing dependencies.
- A single Avileo tenant represents one parking garage for this vertical.

## Decomposition Rationale

This initiative is broad enough to require multiple durable feature briefs because it crosses shared contracts, backend schema/API, frontend operations, reporting, billing limits, onboarding, and QA. The features below are designed to be individually delegable through `/plan` while keeping dependencies explicit.

# Water Vertical Customer Profiles Requirements

## Objective

Make the `agua` business mode operational for bidon delivery sellers by adding typed vertical customer profiles and the screens that use those fields for recurring routes, deliveries, container balances, deposits, and water-specific reporting, without contaminating polleria or future business modes.

## Scope

- In scope: typed water customer profile model, water customer UI, route generation from delivery schedules, delivery visit execution, aggregate container/deposit ledgers, water dashboard, onboarding seed data, sync/schema integration, and QA.
- Out of scope: per-bidon serial tracking, route optimization, GPS, advanced subscriptions billing, and fully dynamic custom-field builders.

## Functional Requirements

- `FR-001` - The base `customers` table remains generic and must not receive water-only columns.
- `FR-002` - Water businesses can create and edit a water customer profile with delivery frequency, delivery days, default bidon quantity, container balance, deposit status, preferred route or zone, and delivery instructions.
- `FR-003` - Polleria businesses do not see, send, or persist water customer profile fields.
- `FR-004` - Customer list and customer detail screens show water-specific operational summaries only when `businessMode = "agua"`.
- `FR-005` - Water businesses can generate a daily route from customers whose profile schedules match the selected day and optional route or zone.
- `FR-006` - The daily route screen shows each stop with address, instructions, expected bidons, container balance, deposit warnings, and delivery status.
- `FR-007` - A delivery visit can record bidons delivered, empty containers collected, damaged/lost containers, payment outcome, and delivery notes.
- `FR-008` - Container balances are updated through auditable ledger entries instead of direct invisible overwrites.
- `FR-009` - Deposit movements are tracked separately from sale revenue and accounts receivable.
- `FR-010` - Water mode uses water-specific product seed data and onboarding copy instead of polleria demo data.
- `FR-011` - Water mode uses water-specific labels in affected UI: bidones/envases/repartidor/ruta/entregado/recogido instead of kg/tara/vendedor/polleria labels.
- `FR-012` - The water dashboard summarizes route progress, delivered bidons, pending stops, containers outside, deposits active, and receivables.
- `FR-013` - New backend writes are tenant-scoped by `businessId` and validate that water profile writes are only allowed for water businesses.
- `FR-014` - New shared/backend schema and generated sync artifacts include the new water tables and contracts required by the frontend.

## Non-Functional Requirements

- `NFR-001` - UI must remain mobile-first for 320px-428px screens.
- `NFR-002` - User-facing text must be Spanish for Peru locale; code comments remain English.
- `NFR-003` - New forms must use existing React Hook Form, Zod, TanStack Query, and Eden Treaty patterns.
- `NFR-004` - New APIs must follow service/repository layering, `ctx` first, domain errors, and transactional writes.
- `NFR-005` - Sync-sensitive schema additions must be represented in backend Drizzle schema, shared schema/contracts, migrations, and sync generation/validation.
- `NFR-006` - Data that drives filtering, routes, deposits, or container balances must be typed columns/tables, not unvalidated JSON blobs.

## Acceptance Criteria

- Creating a polleria customer only writes base customer data.
- Creating an agua customer writes base customer data and a valid water profile in one user flow.
- Editing an agua customer updates both base fields and profile fields without affecting polleria behavior.
- A water route can be generated for a selected delivery day and produces stops from matching customer profiles.
- A delivery stop can be completed with delivered/collected/damaged counts and updates customer container balance through ledger entries.
- Deposit movements are visible separately from sales/cobros and can be audited per customer.
- Water dashboard and route screens do not show polleria-specific kg/tara language.
- Existing polleria registration, customer creation, sales calculator, distributions, and cobranza flows keep working.

## Constraints

- Do not use `customers` as a catch-all for future business fields.
- Do not rely on `modeConfigOverrides` for persisted customer facts.
- Do not hand-edit generated sync artifacts if the repo provides a generator/source-of-truth flow.
- Use aggregate container balances in this plan; serial tracking can be planned later.

## Open Questions

- Should `preferredRouteId` point to existing customer groups/puntos de venta initially, or should water introduce a dedicated `water_routes` table in the first implementation?
- Should deposits be required for every customer with containers, or optional per customer?
- Should water allow credit modes from day one, or default to paid-on-delivery while keeping existing credit functionality available?

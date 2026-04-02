# Add Distribution Create and Close Notes

## Objective

Add support for capturing and persisting a note when a distribution is created and a separate note when a distribution is closed, while keeping the current distribution lifecycle intact across backend schema, API validation, frontend forms, and local/shared distribution contracts.

## Scope

- In scope: persist note fields on `distribuciones`, accept them in create/close flows, expose them through existing distribution reads, update frontend create/close UX to collect them, and validate the end-to-end create/close payloads.
- Out of scope: redesigning the distribution flow, completing the broader offline-first distribution migration, changing inventory transition behavior, or refactoring unrelated stale repository fields beyond what is necessary to safely add the note fields.

## Verified Context

- Verified: Backend `distribuciones` schema in `packages/backend/src/db/schema/inventory.ts` currently stores `puntoVenta`, `puntoVentaId`, `montoRecaudado`, `fecha`, `estado`, `modo`, `closedAt`, and `closedBy`, but no creation or closing note field exists.
- Verified: Shared `distribuciones` schema in `packages/shared/src/schema.ts` mirrors the frontend/local contract and also lacks note fields.
- Verified: `DistribucionService.createDistribucion()` in `packages/backend/src/services/business/distribucion.service.ts` creates the record in state `activo`, creates items/visitas, records a sync operation, and does not accept or persist any note.
- Verified: `DistribucionService.closeDistribucion()` in `packages/backend/src/services/business/distribucion.service.ts` transitions the distribution to `cerrado`, sets `closedAt` and `closedBy`, records a sync operation, and does not accept or persist any note.
- Verified: Backend route validation in `packages/backend/src/api/distribuciones.ts` accepts create fields (`vendedorId`, `puntoVenta`, `puntoVentaId`, `fecha`, `modo`, `groupId`, `items`) and an empty close body, so there is no API path for notes today.
- Verified: Admin create UI in `packages/app/app/components/distribucion/create-distribucion-form.tsx` currently collects seller, point of sale, and optional customer group only; it submits `items: []` and `modo: "libre"` with no note field.
- Verified: Admin create page in `packages/app/app/routes/_protected.distribuciones.nueva._index.tsx` forwards the create form payload to `useCreateDistribucion()` and appends `fecha` from the URL param.
- Verified: Admin close UI in `packages/app/app/routes/_protected.distribuciones.$id.editar._index.tsx` uses a confirmation dialog only and then calls `useCloseDistribucion()` with no note payload.
- Verified: Seller close UI in `packages/app/app/routes/_protected.mi-distribucion.tsx` uses a drawer confirmation only and then calls `useCloseDistribucion()` with no note payload.
- Verified: `packages/app/app/hooks/use-distribuciones.ts` still uses direct API calls for create and close; the local-first `packages/app/app/lib/services/distribucion-service.ts` exists but is incomplete and currently only implements local create without note support.
- Verified: `packages/backend/src/services/repository/distribucion.repository.ts` already carries update logic for `closedAt`/`closedBy`, but also contains stale references to non-schema fields (`totalSales`, `totalAmount`, `cashAmount`, `creditAmount`, `totalKilos`), so changes here must be done carefully.

## Assumptions

- Inferred: The product requirement implies two separate optional fields, one for creation and one for closing, instead of a single generic note field reused for both events.
- Inferred: The notes should live on the `distribuciones` record itself because create and close are lifecycle attributes of one distribution, and current reads already hydrate the distribution entity directly.
- Inferred: The first implementation should follow the currently shipped online-only create/close hooks rather than bundling the broader offline-first migration into the same change.

## Files Involved

- `packages/backend/src/db/schema/inventory.ts` - Modify - add persisted note columns to `distribuciones`.
- `packages/backend/drizzle/` - Create - generate migration for the new note columns.
- `packages/shared/src/schema.ts` - Modify - keep shared/local distribution contract aligned with backend note fields.
- `packages/backend/src/api/distribuciones.ts` - Modify - accept note fields in create and close validators/handlers.
- `packages/backend/src/services/business/distribucion.service.ts` - Modify - thread create/close note inputs into repository writes and sync payloads.
- `packages/backend/src/services/repository/distribucion.repository.ts` - Modify - persist note fields during create/update without disturbing existing close data handling.
- `packages/backend/src/services/sync/schemas/index.ts` - Review/Modify - ensure distribution sync schemas accept the new note fields if distribution sync uses explicit payload schemas.
- `packages/backend/src/services/sync/handlers/DistribucionSyncHandler.ts` - Review - confirm no extra mapping is needed once schemas accept the new fields.
- `packages/app/app/hooks/use-distribuciones.ts` - Modify - extend create/close hook input types and payloads to carry notes.
- `packages/app/app/components/distribucion/create-distribucion-form.tsx` - Modify - add create-note input and include it in submit payload.
- `packages/app/app/routes/_protected.distribuciones.nueva._index.tsx` - Review/Modify - ensure the create page passes the note-bearing payload through unchanged.
- `packages/app/app/routes/_protected.distribuciones.$id.editar._index.tsx` - Modify - replace close-only confirmation with a close flow that captures a close note before mutation.
- `packages/app/app/routes/_protected.mi-distribucion.tsx` - Modify - update seller close drawer to collect and submit the close note.
- `packages/app/app/lib/services/distribucion-service.ts` - Review/Modify - keep the local-first distribution service contract aligned with the new note fields even if the current UI path stays online-only.
- `packages/backend/src/services/transitions/distribucion.test.ts` - Review - verify transition tests do not require changes because note persistence is outside inventory movement logic.
- `packages/app/e2e/tests/` - Create/Modify - add coverage for create-note and close-note flows if this repo’s E2E suite is the chosen validation surface.
- `docs/technical/database.md` - Review/Modify - update the documented `distribuciones` shape if schema docs are kept current with implementation.

## Ordered Execution Steps

1. **Decide the persisted note shape**
   - Files: `packages/backend/src/db/schema/inventory.ts`, `packages/shared/src/schema.ts`, `docs/technical/database.md`
   - Action: Confirm and document whether the implementation will use `notaCreacion` and `notaCierre` as two distinct optional text columns on `distribuciones`; reflect the chosen names consistently across backend and shared schema contracts.
   - Depends on: none

2. **Add note columns to the backend database schema**
   - Files: `packages/backend/src/db/schema/inventory.ts`, `packages/backend/drizzle/`
   - Action: Add the chosen optional note columns to the `distribuciones` table and generate a migration so existing rows remain valid and default to `NULL`.
   - Depends on: 1

3. **Align the shared/local distribution contract**
   - Files: `packages/shared/src/schema.ts`, `packages/app/app/lib/services/distribucion-service.ts`
   - Action: Add the same note fields to the shared schema and local distribution service types so frontend queries, local inserts, and future offline-first work use the same entity shape.
   - Depends on: 1

4. **Thread note fields through backend create and close APIs**
   - Files: `packages/backend/src/api/distribuciones.ts`, `packages/backend/src/services/business/distribucion.service.ts`, `packages/backend/src/services/repository/distribucion.repository.ts`
   - Action: Extend the create body schema to accept the create note and the close body schema to accept the close note; pass both through service validation/orchestration into repository create/update calls and include them in sync-operation payloads when appropriate.
   - Depends on: 2, 3

5. **Review sync ingestion/parsing for distribution payloads**
   - Files: `packages/backend/src/services/sync/schemas/index.ts`, `packages/backend/src/services/sync/handlers/DistribucionSyncHandler.ts`
   - Action: Update or confirm sync schemas/handlers so create and update payloads containing the note fields are accepted during sync processing and do not get dropped.
   - Depends on: 4

6. **Add create-note capture in the admin UI**
   - Files: `packages/app/app/components/distribucion/create-distribucion-form.tsx`, `packages/app/app/routes/_protected.distribuciones.nueva._index.tsx`, `packages/app/app/hooks/use-distribuciones.ts`
   - Action: Add a textarea or equivalent form control for the creation note, keep it optional unless product says otherwise, extend `CreateDistribucionApiInput`, and submit the note in the existing create mutation payload.
   - Depends on: 3, 4

7. **Add close-note capture in both admin and seller close flows**
   - Files: `packages/app/app/routes/_protected.distribuciones.$id.editar._index.tsx`, `packages/app/app/routes/_protected.mi-distribucion.tsx`, `packages/app/app/hooks/use-distribuciones.ts`
   - Action: Replace the current confirmation-only close interactions with note-aware dialogs/drawers that collect an optional close note, submit it through `useCloseDistribucion()`, and keep the existing inventory-return behavior unchanged.
   - Depends on: 4

8. **Expose and verify note values in existing reads**
   - Files: `packages/backend/src/services/repository/distribucion.repository.ts`, `packages/app/app/hooks/use-distribuciones.ts`, `packages/app/app/routes/_protected.distribuciones.$id.editar._index.tsx`, `packages/app/app/routes/_protected.mi-distribucion.tsx`
   - Action: Confirm the existing read paths automatically include the new note fields after schema updates, and decide whether any current edit/detail screens should display the stored notes for operator feedback after create/close.
   - Depends on: 4, 6, 7

9. **Add regression coverage and schema documentation updates**
   - Files: `packages/backend/src/services/transitions/distribucion.test.ts`, `packages/app/e2e/tests/`, `docs/technical/database.md`
   - Action: Add targeted tests for create and close payload acceptance plus manual/E2E coverage for note entry, and update any maintained schema docs to reflect the new fields.
   - Depends on: 5, 6, 7, 8

## Risks and Edge Cases

- Pre-existing rows will not have notes, so all new columns must be nullable and UI must handle `null`/empty strings safely.
- The project has a known backend/shared schema drift around distributions; adding note fields to only one side will break local reads or future sync work.
- The current distribution hooks are online-only, but `packages/app/app/lib/services/distribucion-service.ts` also defines a distribution shape; if it is left stale, future migration work can silently drop the new note fields.
- `packages/backend/src/services/repository/distribucion.repository.ts` already contains stale non-schema update properties; editing that file without care could worsen compile/runtime drift.
- Closing a distribution from both admin and seller entry points must use the same close-note contract to avoid one flow persisting notes and the other omitting them.
- If product later wants mandatory close notes only for certain statuses or roles, frontend and backend validation rules will need to diverge by context.

## Validation Strategy

- Run backend type/lint/build validation after schema, repository, service, and route changes.
- Generate and review the Drizzle migration to confirm the new columns are nullable and named consistently.
- Verify create API manually or with tests: submit a distribution with and without a creation note and confirm the persisted record includes the expected value.
- Verify close API manually or with tests: close a distribution with and without a closing note and confirm `estado`, `closedAt`, `closedBy`, and the close note are all persisted together.
- Exercise both frontend close entry points (`/distribuciones/:id/editar` and `/mi-distribucion`) to confirm both send the same close payload shape.
- If E2E coverage is added, include one admin create flow with a note and one close flow with a note.

## Open Questions

- Should the persisted fields be named in Spanish (`notaCreacion`, `notaCierre`) to match current domain language, or in English (`creationNote`, `closingNote`) to match some newer code conventions?
- Are both notes optional, or should one/both be required by product or role?
- Should the close note be editable after closure, or immutable once the distribution is closed?
- Do the create and close notes need to be displayed anywhere in the current UI after persistence, or is capture-only sufficient for this first increment?
- Should this change also update the incomplete local-first `DistribucionService` implementation now, or only keep its type contract aligned and leave behavior migration for a separate task?

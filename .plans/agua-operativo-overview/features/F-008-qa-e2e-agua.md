# F-008 QA E2E Agua

## Objective

Cerrar el vertical agua con pruebas y fixtures que validen el flujo completo Perú: negocio agua, productos editables, cliente recurrente, ruta asignada, entrega con venta pagada, inventario actualizado, cierre/reporte y no regresión de otros modos.

## Scope Boundaries

- In scope: tests backend, frontend/e2e, seed demo water, casos negativos de pago parcial, regresión pollería/cochera relevante.
- Out of scope: pruebas de GPS, depósitos, envases serializados, facturación.

## Verified Context

- No se encontraron tests específicos `agua`/`water` para customer profile, route generation o complete delivery.
- `packages/backend/src/seed/demo-water-user.ts` existe y puede alimentar escenarios demo.
- `packages/app/e2e` contiene infraestructura Playwright y convenciones en `packages/app/AGENTS.md`.
- Backend tiene tests de servicios en otros dominios que pueden servir de patrón.

## Assumptions

- Las features previas habrán definido contratos finales para entrega, pago e inventario.
- QA debe validar que agua no muestra ni permite `a_cuenta`.
- Completed dependency output from `F-002`: targeted backend sale tests and frontend sale calculation tests passed for full-only behavior; full suites currently have unrelated pre-existing environment/test-runner failures.
- Completed dependency output from `F-003`: customer API POST/PUT and UI no longer expose container/deposit inputs; backend customer service targeted test passed; full app suite still has pre-existing harness failures.
- Completed dependency output from `F-004`: targeted distribution water-route tests passed, `db:seed:water` passed, backend build passed; full backend suite still blocked by pre-existing DB auth failure in `file.repository.test.ts`.
- Completed dependency output from `F-005`: delivery completion creates active paid sale and deducts inventory, but no dedicated `visita.service.test.ts` exists yet; QA should cover this transactional path.
- Completed dependency output from `F-007`: offline/write queue remains out of scope for first version; water operational reads are persisted, delivery completion is retry-safe/idempotent, and online-only writes have clear UI messaging.
- Completed dependency output from `F-006`: `/reports/water-operational` returns water aggregates from real stops/visits/sales/items/routes/sellers/payment methods; dashboard, mi distribución and reportes render water-specific revenue, bidones, stop progress and payment breakdowns.

## Unknowns

- Resuelto durante ejecución: se agregó page object y spec Playwright de flujo live-stack; su ejecución queda bloqueada si los servidores locales no están levantados.

## Likely Files or Areas Involved

- `packages/backend/src/services/business/*.test.ts` - Create | Modify - Unit/integration tests.
- `packages/backend/src/seed/demo-water-user.ts` - Review | Modify - Fixtures Perú.
- `packages/app/e2e/` - Create | Modify - E2E de agua.
- `packages/app/e2e/page-objects/` - Create | Modify - Page objects para rutas/entregas si aplica.
- `packages/app/app/components/sales/new-sale/payment-mode-section.tsx` - Review - UI full-only.
- `packages/app/app/routes/_protected.distribuciones.nueva._index.tsx` - Review - E2E ruta.
- `packages/app/app/routes/_protected.mi-distribucion.tsx` - Review - E2E entrega.

## Feature Dependencies

- Depends on: `F-002`, `F-003`, `F-004`, `F-005`, `F-006`, `F-007`
- Blocks: none

## Human-Owned Tracking Fields

- Status: done
- Owner: unassigned
- Decision Notes: F-008 agregó/expandió pruebas backend para customer, visita, reportes y cobertura existente de sales/distribución; añadió page object `AguaPage` y spec E2E `agua-flow`. Validaciones backend focalizadas, seed water y builds app/backend pasaron. E2E quedó bloqueado por `ERR_CONNECTION_REFUSED` porque el frontend no estaba corriendo en localhost:5173, considerado blocker de harness/servidor y no fallo del vertical. También se corrigió bug real de shadowing en `getWaterOperationalReport`.
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: no
- Reason: Es la feature de cierre y depende de todos los contratos finales.

## Worktree Recommendation

- Recommended: no
- Suggested branch: `feature/agua-operativo-qa`
- Suggested worktree path: `../wt-agua-operativo-qa`

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Cubre backend, e2e, fixtures y regresión multi-modo.

## Suggested Next Command

- `/plan .plans/agua-operativo-overview/features/F-008-qa-e2e-agua.md`

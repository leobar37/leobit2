# F-002 Pago Total Backend

## Objective

Garantizar que el modo agua solo permita ventas al contado con pago completo en backend, API y UI, cerrando la brecha donde la UI oculta `a_cuenta` pero el backend aún podría aceptar crédito/parcial.

## Scope Boundaries

- In scope: validaciones de `saleType`, `paymentMode`, `amountPaid`, mensajes de error, pruebas de ventas para agua y no regresión de pollería/cochera.
- Out of scope: crear ventas desde entrega, cierre de ruta, reportes, cambios de métodos de pago disponibles.

## Verified Context

- `packages/app/app/components/sales/new-sale/payment-mode-section.tsx` filtra agua a `pago_total`.
- `packages/backend/src/services/business/sale.service.ts` valida payment mode pero no consulta `ctx.businessMode` para agua.
- `packages/backend/src/api/sales.ts` acepta `pago_total`, `a_cuenta`, `debe_todo` en contratos generales.
- `packages/shared/src/business-modes/defaults.ts` marca agua con `supportsCreditSettlement: false` y `supportsPartialSettlement: false`.

## Assumptions

- Pollería y cochera deben conservar sus reglas actuales de crédito/parcial donde apliquen.
- La restricción debe vivir en backend aunque la UI ya esté restringida.
- Completed dependency output from `F-001`: no new water container-loan flag exists; rely on existing water mode flags and simplified water profile inputs. API backward compatibility may accept old water fields, but service logic should neutralize out-of-scope fields.

## Unknowns

- Resuelto durante ejecución: la validación central vive en `SaleService` y cubre `saleType`, `paymentMode` y `amountPaid` para `ctx.businessMode === "agua"`.

## Likely Files or Areas Involved

- `packages/backend/src/services/business/sale.service.ts` - Modify - Validación central de pago/venta.
- `packages/backend/src/api/sales.ts` - Review | Modify - Contratos y mensajes API si hace falta.
- `packages/shared/src/business-modes/defaults.ts` - Review - Reusar flags existentes.
- `packages/app/app/components/sales/new-sale/payment-mode-section.tsx` - Review - Confirmar UI ya alineada.
- `packages/backend/src/services/business/sale.service*.test.ts` - Create | Modify - Cobertura full-only en agua.
- `packages/app/app/hooks/use-sale-calculations.test.ts` - Review | Modify - No romper cálculos de otros modos.

## Feature Dependencies

- Depends on: `F-001`
- Blocks: `F-005`, `F-008`

## Human-Owned Tracking Fields

- Status: done
- Owner: unassigned
- Decision Notes: F-002 agregó validación backend centralizada para rechazar crédito, `a_cuenta`, `debe_todo` y `pago_total` incompleto en agua. Agua acepta `contado` + `pago_total` + monto completo, preservando métodos como Yape. Pollería mantiene crédito/parcial. Tests focalizados pasaron; suites completas siguen bloqueadas por fallas preexistentes de entorno/test runner.
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: limited
- Reason: Puede correr junto con `F-003` tras `F-001`, pero no junto con `F-005` porque ambos tocarán ventas.

## Worktree Recommendation

- Recommended: yes
- Suggested branch: `feature/agua-operativo-pago-total`
- Suggested worktree path: `../wt-agua-operativo-pago-total`

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Requiere backend, API y tests de regresión multi-modo.

## Suggested Next Command

- `/plan .plans/agua-operativo-overview/features/F-002-pago-total-backend.md`

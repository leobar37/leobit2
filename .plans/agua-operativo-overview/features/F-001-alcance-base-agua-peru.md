# F-001 Alcance Base Agua Perú

## Objective

Consolidar el alcance base del vertical agua para Perú: bidones/recargas son productos editables de inventario, el flujo base no usa préstamos, retornos, depósitos ni penalidades de envases, y el lenguaje/flags deben reflejar venta por unidad con pago completo.

## Scope Boundaries

- In scope: reglas de alcance, labels/flags de agua, neutralización del flujo visible de envases/depositos, compatibilidad con productos semilla editables.
- Out of scope: crear ventas automáticas, modificar inventario en entrega, reportes finales, GPS, depósitos o serialización futura.

## Verified Context

- `packages/shared/src/business-modes/defaults.ts` define agua con unidad y sin crédito/parcial.
- `packages/backend/src/db/schema/water.ts` contiene campos de envases y depósitos que exceden el flujo base.
- `packages/app/app/components/customers/customer-form-content.tsx` ya muestra texto indicando que el control de envases retornables queda fuera del flujo base.
- `packages/backend/src/services/business/business.service.ts` crea productos de agua como productos normales.

## Assumptions

- Las tablas de ledger de envases/depositos pueden quedar reservadas para fase futura, pero no deben guiar el flujo base.
- Productos semilla serán editables por admin desde el módulo actual de productos.

## Unknowns

- Resuelto durante ejecución: no se requiere un flag explícito tipo `useContainerLoans`; `useContainers: false` y `useDeposits: false` cubren el alcance base.

## Likely Files or Areas Involved

- `packages/shared/src/business-modes/defaults.ts` - Review | Modify - Fuente de flags por modo.
- `packages/shared/src/business-modes/schema.ts` - Review | Modify - Contratos de flags si se agrega una señal explícita.
- `packages/app/app/components/customers/customer-form-content.tsx` - Review | Modify - Evitar campos o copy confusos.
- `packages/app/app/routes/_protected.clientes.$id._index.tsx` - Review | Modify - Detalle cliente agua sin depósitos/envases prestados.
- `packages/backend/src/services/business/customer.service.ts` - Review | Modify - Validar perfil water sin flujo de depósitos.
- `packages/backend/src/db/schema/water.ts` - Review - Entender campos existentes sin borrarlos.

## Feature Dependencies

- Depends on: none
- Blocks: `F-002`, `F-003`, `F-004`

## Human-Owned Tracking Fields

- Status: done
- Owner: unassigned
- Decision Notes: F-001 removió campos de entrada de envases/depositos del flujo de clientes agua sin borrar columnas/tablas futuras. Mantener compatibilidad API aceptando campos antiguos, pero neutralizarlos en service/repository. `WaterCustomerProfile` response conserva columnas completas; input queda simplificado. Seeds/productos de agua siguen como productos normales editables.
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: no
- Reason: Define el contrato funcional que otras features deben respetar.

## Worktree Recommendation

- Recommended: no
- Suggested branch: `feature/agua-operativo-alcance-base`
- Suggested worktree path: `../wt-agua-operativo-alcance-base`

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Cruza shared, backend y frontend con decisiones de compatibilidad.

## Suggested Next Command

- `/plan .plans/agua-operativo-overview/features/F-001-alcance-base-agua-peru.md`

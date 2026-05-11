# F-004 Rutas Agua Admin Repartidor

## Objective

Endurecer el flujo admin → repartidor para agua: preview de clientes programados, generación de distribución/visitas/stops, calendario consistente y seed demo funcional para Perú.

## Scope Boundaries

- In scope: preview/generate de ruta, asignación de repartidor, validación de días, corrección de seeds, UX de ruta nueva.
- Out of scope: crear ventas al completar entrega, descuento de inventario, reportes, sync final.

## Verified Context

- `packages/backend/src/services/business/distribucion.service.ts` implementa `previewWaterRoute` y `generateWaterRoute`.
- `packages/backend/src/api/distribuciones.ts` expone `/water/preview` y `/water/generate`.
- `packages/app/app/routes/_protected.distribuciones.nueva._index.tsx` muestra flujo Nueva Ruta en agua.
- `packages/backend/src/seed/demo-water-user.ts` crea rutas y perfiles water.
- El backend espera day keys en inglés; el seed actual contiene días en español.

## Assumptions

- La ruta de agua puede reutilizar `distribuciones` y `visitas` con `water_delivery_stops` como extensión.
- La asignación a repartidor usa `vendedorId`/`businessUserId` existente.
- Completed dependency output from `F-003`: water customer create/edit API and UI now accept only operational profile fields; route generation should rely on frequency, delivery days, default quantity, formal route, free zone and delivery instructions.

## Unknowns

- Pendiente futuro: si se debe permitir agregar clientes no programados a una ruta del día desde la misma pantalla. No fue necesario para cerrar F-004.

## Likely Files or Areas Involved

- `packages/backend/src/services/business/distribucion.service.ts` - Modify - Calendario, generación y validaciones.
- `packages/backend/src/api/distribuciones.ts` - Review | Modify - Contratos preview/generate.
- `packages/backend/src/services/repository/water-customer-profile.repository.ts` - Review | Modify - Candidatos programados.
- `packages/backend/src/seed/demo-water-user.ts` - Modify - Días y datos Perú funcionales.
- `packages/app/app/routes/_protected.distribuciones.nueva._index.tsx` - Modify - UX de preview/generación.
- `packages/app/app/hooks/use-distribuciones.ts` - Review | Modify - Tipos de preview/generate.

## Feature Dependencies

- Depends on: `F-001`, `F-003`
- Blocks: `F-005`, `F-008`

## Human-Owned Tracking Fields

- Status: done
- Owner: unassigned
- Decision Notes: F-004 corrigió seed water para usar day keys en inglés, agregó repartidor demo, neutralizó containers/deposits en perfiles semilla, añadió guard contra distribución duplicada por vendedor/fecha y cubrió preview/generate con tests focalizados. API/frontend se preservaron sin cambios. Tests focalizados, seed water y build backend pasaron; suite backend completa sigue bloqueada por falla preexistente de auth DB en file.repository.test.ts.
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: no
- Reason: Depende del perfil de cliente y es prerequisito directo de entrega transaccional.

## Worktree Recommendation

- Recommended: no
- Suggested branch: `feature/agua-operativo-rutas`
- Suggested worktree path: `../wt-agua-operativo-rutas`

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Abarca backend, frontend, seeds y validación de calendario.

## Suggested Next Command

- `/plan .plans/agua-operativo-overview/features/F-004-rutas-agua-admin-repartidor.md`

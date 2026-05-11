# F-007 Sync Offline Agua

## Objective

Validar y completar la compatibilidad offline/sync del flujo agua operativo para que rutas, stops, ventas, pagos e inventario mantengan consistencia con la arquitectura Avileo.

## Scope Boundaries

- In scope: revisar exposición de tablas water, operaciones de entrega/venta, cola/sync si aplica, conflictos básicos y tests de compatibilidad.
- Out of scope: rediseñar todo sync, añadir GPS, hacer serialización de envases.

## Verified Context

- `packages/shared/src/schema.ts` incluye tablas water.
- El proyecto usa arquitectura offline-first/sync-aware según `AGENTS.md`.
- Existe infraestructura de sync en `packages/app/app/lib/sync` y backend `packages/backend/src/services/sync`.
- El flujo actual de agua usa APIs backend para generar y completar rutas, pero no está validado por tests water.

## Assumptions

- Algunas acciones admin como generar ruta pueden requerir conexión, pero el repartidor debería tener una experiencia robusta ante conectividad intermitente.
- La venta creada por entrega debe seguir el mismo camino sync-compatible que ventas existentes siempre que sea posible.
- Completed dependency output from `F-005`: water delivery completion now writes sale, sale item, payment method, visita saleId and inventory deduction in the backend transaction; frontend uses `useAllVariants` and `useCompleteWaterDelivery` payload with selected variant/payment method.

## Unknowns

- Resuelto durante ejecución: para la primera versión operativa, rutas/entregas de agua mantienen writes online-only con UI deshabilitada y mensajes claros; se agregan lecturas persistidas y reintentos seguros.
- Resuelto durante ejecución: no se agregan nuevas entidades sync para water stops; se reutilizan rutas REST/TanStack existentes y persisted query keys para lecturas operativas.

## Likely Files or Areas Involved

- `packages/shared/src/schema.ts` - Review | Modify - Exposición contractual de tablas water.
- `packages/shared/src/sync-config.ts` - Review | Modify - Config de entidades si aplica.
- `packages/app/app/lib/sync/` - Review | Modify - Flujo offline cliente.
- `packages/app/app/hooks/use-visitas.ts` - Review | Modify - Mutación de completar entrega.
- `packages/app/app/hooks/use-sales.ts` - Review | Modify - Reuso de ventas sync-aware.
- `packages/backend/src/services/sync/` - Review | Modify - Handlers para entidades requeridas.
- `packages/backend/src/services/business/visita.service.ts` - Review - Contrato transaccional post `F-005`.

## Feature Dependencies

- Depends on: `F-005`
- Blocks: `F-008`

## Human-Owned Tracking Fields

- Status: done
- Owner: unassigned
- Decision Notes: F-007 reutilizó REST/TanStack en vez de agregar entidades sync nuevas, agregó persisted query keys para lecturas operativas de agua, hizo idempotente/retry-safe la entrega para evitar duplicar venta/ledger/inventario, y mantuvo writes de entrega online-only con UI/mensajes claros. Validaron shared/app/backend build y test focalizado de `visita.service`; full backend suite sigue bloqueada por fallo preexistente de credenciales DB.
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: yes
- Reason: Puede avanzar junto a reportes tras estabilizar la forma transaccional de entrega.

## Worktree Recommendation

- Recommended: yes
- Suggested branch: `feature/agua-operativo-sync`
- Suggested worktree path: `../wt-agua-operativo-sync`

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Requiere análisis de arquitectura sync y validación cross-layer.

## Suggested Next Command

- `/plan .plans/agua-operativo-overview/features/F-007-sync-offline-agua.md`

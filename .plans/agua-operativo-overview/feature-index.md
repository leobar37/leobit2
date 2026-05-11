# Agua Operativo Feature Index

## Summary

- Mode: Initiative Overview
- Slug: `agua-operativo-overview`
- Feature Briefs Directory: `features/`
- Dependency Graph: `dependency-graph.md`
- Worktree Strategy: `worktrees.md`

## Feature List

| Feature ID | Brief File | Goal | Suggested Plan Mode | Dependencies | Parallelizable | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `F-001` | `features/F-001-alcance-base-agua-peru.md` | Consolidar el alcance base de agua Perú sin préstamos/devoluciones/depositos y con bidones como productos editables. | `structured` | none | no | done | unassigned |
| `F-002` | `features/F-002-pago-total-backend.md` | Garantizar pago total end-to-end para agua, especialmente en backend/API. | `structured` | `F-001` | no | done | unassigned |
| `F-003` | `features/F-003-cliente-agua-operacional.md` | Dejar el perfil de cliente de agua listo para rutas recurrentes sin campos confusos de envases/depositos. | `structured` | `F-001` | yes | done | unassigned |
| `F-004` | `features/F-004-rutas-agua-admin-repartidor.md` | Endurecer creación, preview y generación de rutas de agua asignadas a repartidor, corrigiendo seeds/calendario. | `structured` | `F-001`, `F-003` | no | done | unassigned |
| `F-005` | `features/F-005-entrega-como-venta-inventario.md` | Convertir cada entrega de bidones en venta al contado con descuento de inventario. | `structured` | `F-002`, `F-004` | no | done | unassigned |
| `F-006` | `features/F-006-cierre-reportes-dashboard-agua.md` | Mostrar cierre, recaudación y métricas de agua basadas en ventas/entregas reales. | `structured` | `F-005` | yes | done | unassigned |
| `F-007` | `features/F-007-sync-offline-agua.md` | Validar y completar compatibilidad sync/offline de rutas, entregas, ventas e inventario de agua. | `structured` | `F-005` | yes | done | unassigned |
| `F-008` | `features/F-008-qa-e2e-agua.md` | Cubrir el flujo agua completo con tests backend/frontend/e2e y fixtures Perú. | `structured` | `F-002`, `F-003`, `F-004`, `F-005`, `F-006`, `F-007` | no | done | unassigned |

## Suggested Execution Waves

1. **Wave 1 - Foundation**: `F-001` completed
2. **Wave 2 - Rules and Customer Surface**: `F-002`, `F-003` completed
3. **Wave 3 - Route Flow**: `F-004` completed
4. **Wave 4 - Transactional Delivery**: `F-005` completed
5. **Wave 5 - Observability and Offline**: `F-006`, `F-007` completed
6. **Wave 6 - QA Closure**: `F-008` completed

## Change Log (for refreshes)

- Added: `F-001`, `F-002`, `F-003`, `F-004`, `F-005`, `F-006`, `F-007`, `F-008`
- Removed: none
- Split: none
- Merged: none
- Status Updated: `F-001` marked done after execution report; next unblocked batch is `F-002`, `F-003`.
- Status Updated: `F-002` marked done after execution report; `F-003` remains next unblocked feature.
- Status Updated: `F-003` marked done after execution report; `F-004` is now unblocked.
- Status Updated: `F-004` marked done after execution report; `F-005` is now unblocked.
- Status Updated: `F-005` marked done after execution report; `F-006` and `F-007` are now unblocked.
- Status Updated: `F-007` marked done after execution report; `F-006` remains the next unblocked feature before `F-008`.
- Status Updated: `F-006` marked done after execution report; `F-008` is now unblocked.
- Status Updated: `F-008` marked done after execution report; all overview features are now marked done.

## Follow-up Commands

- `/plan .plans/agua-operativo-overview/features/F-001-alcance-base-agua-peru.md`
- `/plan .plans/agua-operativo-overview/features/F-002-pago-total-backend.md`
- `/plan .plans/agua-operativo-overview/features/F-003-cliente-agua-operacional.md`
- `/plan .plans/agua-operativo-overview/features/F-004-rutas-agua-admin-repartidor.md`
- `/plan .plans/agua-operativo-overview/features/F-005-entrega-como-venta-inventario.md`
- `/plan .plans/agua-operativo-overview/features/F-006-cierre-reportes-dashboard-agua.md`
- `/plan .plans/agua-operativo-overview/features/F-007-sync-offline-agua.md`
- `/plan .plans/agua-operativo-overview/features/F-008-qa-e2e-agua.md`

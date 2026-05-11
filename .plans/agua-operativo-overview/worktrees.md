# Agua Operativo Worktree Recommendations

## Strategy

Use a single main worktree for foundation and high-coupling integration features. Use parallel worktrees only after stable interfaces are established, mainly for reporting and sync/offline validation.

## Recommended Worktree Matrix

| Feature ID | Recommended | Branch Name | Worktree Path | Rationale |
| --- | --- | --- | --- | --- |
| `F-001` | no | `feature/agua-operativo-alcance-base` | n/a | Foundational scope decisions affect many files; keep reviewed in the main tree. |
| `F-002` | yes | `feature/agua-operativo-pago-total` | `../wt-agua-operativo-pago-total` | Mostly sales/payment backend rules; can run after foundation. |
| `F-003` | yes | `feature/agua-operativo-cliente` | `../wt-agua-operativo-cliente` | Mostly customer profile UI/API; can run alongside `F-002` if `F-001` is stable. |
| `F-004` | no | `feature/agua-operativo-rutas` | n/a | Depends on customer profile shape and seed/calendar corrections. |
| `F-005` | no | `feature/agua-operativo-entrega-venta` | n/a | High-coupling integration across visits, sales, payments and inventory. |
| `F-006` | yes | `feature/agua-operativo-reportes` | `../wt-agua-operativo-reportes` | Reporting can proceed independently once delivery creates real sales. |
| `F-007` | yes | `feature/agua-operativo-sync` | `../wt-agua-operativo-sync` | Sync/offline work can proceed in parallel with reporting after transactional flow is stable. |
| `F-008` | no | `feature/agua-operativo-qa` | n/a | Final validation integrates all outputs. |

## Parallel Waves

1. Wave 1: `F-001`
2. Wave 2: `F-002`, `F-003`
3. Wave 3: `F-004`
4. Wave 4: `F-005`
5. Wave 5: `F-006`, `F-007`
6. Wave 6: `F-008`

## Operational Notes

- Recommendations only. Do not create branches/worktrees automatically.
- Re-check `git status` before any future worktree/branch operation.
- Avoid parallel edits to `SaleService`, `VisitaService`, and shared contracts during `F-005`.

# Agua Operativo Feature Dependency Graph

## Dependency Rules

- `F-001` is the foundation and must complete before any product-facing water changes.
- `F-002` depends on `F-001` because backend payment rules must align with the simplified water scope.
- `F-003` depends on `F-001` because customer profile UI/API must remove confusion around deposits/envases.
- `F-004` depends on `F-001` and `F-003` because route generation depends on clean water customer profiles.
- `F-005` depends on `F-002` and `F-004` because delivery can only create compliant paid sales after payment rules and route stops exist.
- `F-006` and `F-007` depend on `F-005` because reporting and sync need the final transactional shape.
- `F-008` depends on all implementation features because it validates the full operational workflow.

## Graph (ASCII)

F-001
  |\
  | F-003
  |   |
F-002 F-004
  \   /
   F-005
   /   \
F-006 F-007
   \   /
   F-008

## Parallelization Analysis

| Feature | Parallelizable | Why |
| --- | --- | --- |
| `F-001` | no | Establishes scope, naming and constraints for every dependent feature. |
| `F-002` | limited | Can run with `F-003` after `F-001`; it touches sales/payment backend mostly. |
| `F-003` | limited | Can run with `F-002` after `F-001`; it touches customer UI/API mostly. |
| `F-004` | no | Depends on customer profile shape and affects route generation/seed behavior. |
| `F-005` | no | Core integration point across visits, sales, inventory and payment. |
| `F-006` | yes | After `F-005`, reporting can proceed independently from sync if contracts are stable. |
| `F-007` | yes | After `F-005`, sync/offline validation can proceed independently from reporting. |
| `F-008` | no | Final QA needs all prior behavior in place. |

## Valid Execution Orders

- Primary: `F-001` → (`F-002`, `F-003`) → `F-004` → `F-005` → (`F-006`, `F-007`) → `F-008`
- Conservative: `F-001` → `F-002` → `F-003` → `F-004` → `F-005` → `F-006` → `F-007` → `F-008`

## Validation Checks

- [x] No circular dependencies
- [x] No dependency references to missing feature IDs
- [x] At least one valid execution order exists
- [x] Every non-foundation feature has a justified dependency path or explicit parallel reason

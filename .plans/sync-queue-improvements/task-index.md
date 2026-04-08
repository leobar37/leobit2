# Sync Queue Improvements — Task Index

| ID | Task | Phase | Dependencies | Requirements |
|----|------|-------|-------------|--------------|
| T-001 | Deduplicate dead-letter logic | infrastructure | — | FR-001 |
| T-002 | Implement deep merge for coalescing | functional | T-001 | FR-002 |
| T-003 | Move priority ordering into queue | functional | T-001 | FR-003 |
| T-004 | Add cleanupCompleted method | functional | T-001 | FR-004 |
| T-005 | Replace console.log with syncLogger | hygiene | T-001 | NFR-001 |
| T-006 | Centralize ISyncQueue exports | hygiene | T-001 | NFR-002 |

## Execution Order

T-001 es prerequisito de todos porque establece la versión limpia de `moveToDeadLetter`. T-002, T-003, T-004, T-005, T-006 son independientes entre sí y pueden ejecutarse en paralelo después de T-001.

## Phase Legend

- `infrastructure` — cambios estructurales en responsabilidades
- `functional` — comportamiento observable de la cola
- `hygiene` — limpieza de código sin cambio de comportamiento

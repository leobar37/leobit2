# Task Index — Storage Abstraction Refactor

| ID | Task | Status | Dependencies |
|----|------|--------|--------------|
| T-001 | Device Identity abstraction | pending | — |
| T-002 | Eliminar legacy localStorage fallback | pending | T-001 |
| T-003 | Abstraer window.location navegación | pending | T-001 |
| T-004 | Abstraer online/offline detection | pending | T-001 |

## Secuencia de ejecución

1. **T-001** (fundacional — establece el patrón)
2. **T-002, T-003, T-004** en paralelo entre sí

## Paralelización

T-002, T-003 y T-004 son independientes entre sí y pueden ejecutarse en paralelo después de T-001. Cada una toca archivos distintos.

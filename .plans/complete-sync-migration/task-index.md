# Task Index: Migración Completa al Engine de Sync

## Resumen

| ID | Tarea | Requisitos | Estado | Prioridad |
|----|-------|------------|--------|-----------|
| T-001 | Migrar `useDeleteSale` a sync engine | FR-001 | pending | 🔴 Alta |
| T-002 | Marcar distribuciones como online-only con guardas | FR-002 | pending | 🟡 Media |
| T-003 | Migrar `useBulkAssignGroups` a sync engine | FR-003 | pending | 🟡 Media |
| T-004 | Limpieza de código legacy (clientes) | FR-004 | pending | 🟢 Baja |
| T-005 | Evaluar `SaleService` con generated service | FR-005 | pending | 🟡 Media |

## Dependencias

```
T-001 (useDeleteSale)
  └── No tiene dependencias

T-002 (distribuciones guardas)
  └── No tiene dependencias
  └── Independiente de migraciones

T-003 (bulkAssignGroups)
  └── No tiene dependencias
  └── Depende de: CustomerGroupService ya migrado (listo)

T-004 (limpieza legacy)
  └── Depende de: T-001, T-003 (limpieza al final)

T-005 (evaluar SaleService)
  └── Independiente, investigación
```

## Orden de Ejecución Recomendado

1. **T-003** (bulkAssignGroups) — Más simple, quick win
2. **T-001** (useDeleteSale) — Impacto en ventas
3. **T-002** (distribuciones) — Agregar guardas offline, documentar online-only
4. **T-005** (evaluar SaleService) — Investigación, no bloqueante
5. **T-004** (limpieza) — Al final, cuando todo está estable

## Paralelización Posible

- **T-003** puede ejecutarse en paralelo con **T-001**
- **T-005** puede ejecutarse en paralelo con cualquier otra tarea
- **T-002** es independiente (solo agrega guardas UI)

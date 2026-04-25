# Task Index

## Plan: Generar Esquema Drizzle para Frontend

| ID | Task | Status | Priority | Dependencies |
|----|------|--------|----------|--------------|
| T-001 | Crear generador drizzle-schema-generator.ts | pending | high | none |
| T-002 | Implementar mapeo de tipos pgEnum → text + const | pending | high | T-001 |
| T-003 | Integrar generador en pipeline generateAll | pending | high | T-001, T-002 |
| T-004 | Generar enums automáticamente desde sync.schema.json | pending | high | T-001 |
| T-005 | Generar tipos inferidos ($inferSelect/$inferInsert) | pending | medium | T-001 |
| T-006 | Actualizar CLI y scripts de generación | pending | medium | T-003 |
| T-007 | Migrar frontend a usar esquema generado | pending | medium | T-003, T-004, T-005 |
| T-008 | Eliminar schema.ts manual y validar | pending | low | T-007 |

## Execution Order

1. T-001 → T-002 → T-004 → T-005 (foundation)
2. T-003 (integration)
3. T-006 (CLI/scripts)
4. T-007 (migration)
5. T-008 (cleanup)

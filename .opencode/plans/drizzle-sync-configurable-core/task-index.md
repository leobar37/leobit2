# drizzle-sync Configurable Core - Task Index

## Tasks Overview

| ID | Task | Dependencies | Priority | Est. Time |
|----|------|--------------|----------|-----------|
| T-001 | Crear módulo `config/` con tipos y `defineEntity` | None | High | 4h |
| T-002 | Refactorizar tipos genéricos en `core/` | T-001 | High | 3h |
| T-003 | Genericizar `HandlerRegistry` en `server/` | T-001 | High | 3h |
| T-004 | Crear factory `createSyncEngine` | T-001, T-002, T-003 | High | 4h |
| T-005 | Refactorizar `schema-mapper` para usar config | T-001 | Medium | 4h |
| T-006 | Crear preset `avileo.ts` | T-001, T-005 | Medium | 2h |
| T-007 | Actualizar exports en `index.ts` | T-004, T-006 | Medium | 2h |
| T-008 | Tests para nuevo sistema | T-001-T-007 | Medium | 6h |

## Execution Order

```
Phase 1 (Foundation)
├── T-001: Config module (types + defineEntity)
└── T-002: Generic types in core/

Phase 2 (Server Core)
├── T-003: Generic HandlerRegistry
└── T-004: createSyncEngine factory

Phase 3 (PGlite & Retrocompatibilidad)
├── T-005: Dynamic schema-mapper
└── T-006: Avileo preset

Phase 4 (Integration)
├── T-007: Update index.ts exports
└── T-008: Tests
```

## Task Files

- [tasks/T-001-config-module.md](tasks/T-001-config-module.md)
- [tasks/T-002-generic-types-core.md](tasks/T-002-generic-types-core.md)
- [tasks/T-003-generic-handler-registry.md](tasks/T-003-generic-handler-registry.md)
- [tasks/T-004-create-sync-engine.md](tasks/T-004-create-sync-engine.md)
- [tasks/T-005-dynamic-schema-mapper.md](tasks/T-005-dynamic-schema-mapper.md)
- [tasks/T-006-avileo-preset.md](tasks/T-006-avileo-preset.md)
- [tasks/T-007-update-exports.md](tasks/T-007-update-exports.md)
- [tasks/T-008-tests.md](tasks/T-008-tests.md)

## Checklist

See [checklist.json](checklist.json) for machine-readable task state.

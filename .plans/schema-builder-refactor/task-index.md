# Task Index: Schema Builder Refactor

## Tasks

| ID | Task | Priority | Status | Dependencies |
|----|------|----------|--------|--------------|
| T-001 | Create schema-types.ts with SyncSchema types | High | pending | - |
| T-002 | Create serializer.ts with serialization utilities | High | pending | T-001 |
| T-003 | Create SchemaManager class | High | pending | T-001, T-002 |
| T-004 | Create SyncConfigBuilder class | High | pending | T-003 |
| T-005 | Update defineSyncConfig to return builder | High | pending | T-004 |
| T-006 | Update config types and add SchemaConfig | High | pending | T-001 |
| T-007 | Update config/index.ts exports | Medium | pending | T-005 |
| T-008 | Create CLI schema-loader.ts | High | pending | T-001 |
| T-009 | Refactor CLI to use schema.json | High | pending | T-008 |
| T-010 | Update generators to accept SyncSchema | Medium | pending | T-001 |
| T-011 | Update generator.ts orchestrator | Medium | pending | T-010 |
| T-012 | Add watch mode to SchemaManager | Medium | pending | T-003 |
| T-013 | Update validator for schema config | Low | pending | T-006 |
| T-014 | Update backend sync.config.ts | Medium | pending | T-005 |
| T-015 | Add tests for SchemaManager | Medium | pending | T-003 |
| T-016 | Add tests for SyncConfigBuilder | Medium | pending | T-004 |
| T-017 | Update package.json exports if needed | Low | pending | - |
| T-018 | Update tsup.config.ts for CLI build | Low | pending | - |
| T-019 | Write documentation for new architecture | Low | pending | All |

## Execution Order

### Phase 1: Foundation (Tasks T-001 to T-007)
- Define types, create core classes
- Establish builder pattern
- **Milestone:** Can instantiate SyncConfigBuilder with schema config

### Phase 2: CLI Refactor (Tasks T-008 to T-011)
- Create schema loader
- Refactor CLI commands
- Update generators
- **Milestone:** CLI generates files from schema.json without executing TS

### Phase 3: Features (Tasks T-012 to T-014)
- Add watch mode
- Update backend config
- **Milestone:** Auto-regeneration works in development

### Phase 4: Polish (Tasks T-015 to T-019)
- Add tests
- Update exports/build config
- Documentation
- **Milestone:** Feature complete and documented

## Parallelization

- T-001 and T-006 can be done in parallel
- T-002 depends on T-001
- T-003 depends on T-001, T-002
- T-004 depends on T-003
- T-005 depends on T-004
- T-007 depends on T-005
- T-008 depends on T-001
- T-009 depends on T-008
- T-010 can be done in parallel with T-008-T-009 (same input type)
- T-011 depends on T-010
- T-012 depends on T-003
- T-013 can be done in parallel with T-012
- T-014 depends on T-005
- T-015 depends on T-003
- T-016 depends on T-004
- T-017 and T-018 can be done anytime
- T-019 depends on all

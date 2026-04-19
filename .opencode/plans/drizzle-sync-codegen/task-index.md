# Task Index

## Task Overview

| ID | Task | Priority | Dependencies | Estimated Time |
|----|------|----------|--------------|----------------|
| T-001 | Define Config API | High | None | 4 hours |
| T-002 | CLI Tool Infrastructure | High | T-001 | 3 hours |
| T-003 | Drizzle Introspection Module | High | T-001 | 3 hours |
| T-004 | Zod Schema Generator | High | T-003 | 3 hours |
| T-005 | PGlite DDL Generator | High | T-003 | 2 hours |
| T-006 | Change Applier Config Generator | High | T-003 | 2 hours |
| T-013 | Relation Detection & Cascade Config | **CRITICAL** | T-001, T-003 | 4 hours |
| T-007 | React Hooks Generator | Medium | T-004, T-013 | 4 hours |
| T-008 | Backend Integration | High | T-002, T-004, T-005, T-006, T-013 | 2 hours |
| T-009 | Frontend Integration | High | T-008 | 2 hours |
| T-010 | Documentation & Testing | Medium | T-009 | 3 hours |
| T-011 | CLI Validation Command | Medium | T-002, T-013 | 2 hours |
| T-012 | CLI Diff Command | Low | T-002 | 2 hours |

## Execution Order

### Phase 1: Core Infrastructure (Foundation)
1. T-001: Define Config API
2. T-002: CLI Tool Infrastructure  
3. T-003: Drizzle Introspection Module

### Phase 2: Generators (Building Blocks)
4. T-004: Zod Schema Generator (parallel with T-005, T-006)
5. T-005: PGlite DDL Generator (parallel with T-004, T-006)
6. T-006: Change Applier Config Generator (parallel with T-004, T-005)
7. **T-013: Relation Detection & Cascade Config** (parallel with T-004, T-005, T-006) ⭐

### Phase 3: Advanced Features
8. T-007: React Hooks Generator (requires T-013 for cascade hooks)
9. T-011: CLI Validation Command (optional for MVP)
10. T-012: CLI Diff Command (optional for MVP)

### Phase 4: Integration & Polish
10. T-008: Backend Integration
11. T-009: Frontend Integration
12. T-010: Documentation & Testing

## Dependency Graph

```
T-001 (Define Config API)
  ├── T-002 (CLI Infrastructure)
  │     ├── T-008 (Backend Integration)
  │     │     └── T-009 (Frontend Integration)
  │     ├── T-011 (Validation Command) [optional]
  │     └── T-012 (Diff Command) [optional]
  ├── T-003 (Introspection)
  │     ├── T-004 (Zod Generator)
  │     │     ├── T-007 (Hooks Generator)
  │     │     └── T-008 (Backend Integration)
  │     ├── T-005 (DDL Generator)
  │     │     └── T-008 (Backend Integration)
  │     ├── T-006 (Applier Generator)
  │     │     └── T-008 (Backend Integration)
  │     └── T-013 (Relation & Cascade) ⭐ CRITICAL
  │           ├── T-007 (Hooks Generator - cascade support)
  │           ├── T-006 (Applier Generator - cascade config)
  │           └── T-008 (Backend Integration - priorities)

T-010 (Documentation) depends on T-009
```

## Parallelization Opportunities

Tasks **T-004, T-005, T-006, T-013** can be developed in parallel after T-003 is complete.

**T-007 (React Hooks)** requires T-004 (Zod) and **T-013 (Relations)** for cascade hooks.

Tasks T-011 and T-012 are optional for MVP and can be done after core features.

## Checklist Status

Track progress using: `node ./planner-checklist.js drizzle-sync-codegen`

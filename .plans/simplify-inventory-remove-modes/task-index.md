# Task Index: Simplify Inventory - Remove Modes

## Quick Reference

| Phase | Tasks | Est. Hours |
|-------|-------|------------|
| 1. Database | T-001, T-002, T-011 | 4-6h |
| 2. Backend | T-003, T-004, T-005, T-006 | 6-8h |
| 3. Frontend | T-007, T-008, T-009 | 4-6h |
| 4. Testing | T-010, T-012 | 4-6h |

## Dependency Graph

```
T-001 (DB Migration)
    ├── T-002 (Cierre Items Schema)
    │       └── T-009 (Frontend Cierre Flow)
    ├── T-003 (Backend Remove Modo)
    │       ├── T-004 (Sale Validation)
    │       ├── T-005 (State Machine)
    │       └── T-006 (Sync Schemas)
    │               └── T-010 (Update Tests)
    └── T-007 (Frontend Types)
            └── T-008 (Remove Modo Forms)
                    └── T-009 (Frontend Cierre Flow)
                            └── T-012 (Integration Testing)
```

## Task List

### Phase 1: Database

#### [T-001: DB Migration - Remove modo columns](./tasks/T-001-db-migration-remove-modo-columns.md)
**Status:** pending  
**Priority:** P0 (Blocking)  
**Est. Time:** 2-3h  
**Assignee:** TBD  


**Depends on:** None  
**Blocks:** T-002, T-003, T-007, T-011

---

#### [T-002: DB Schema - Create cierre items table](./tasks/T-002-db-schema-create-cierre-items.md)
**Status:** pending  
**Priority:** P0  
**Est. Time:** 1-2h  
**Assignee:** TBD  

Create new `distribucion_cierre_items` table for close-time product registration.

**Depends on:** T-001  
**Blocks:** T-009

---

#### [T-011: Data Migration - Existing distribuciones](./tasks/T-011-data-migration-existing-distribuciones.md)
**Status:** pending  
**Priority:** P1  
**Est. Time:** 1h  
**Assignee:** TBD  

Migrate existing distribution data (all treated as "libre" mode).

**Depends on:** T-001  
**Blocks:** None (run in production)

---

### Phase 2: Backend

#### [T-003: Backend - Remove distribucion modo](./tasks/T-003-backend-remove-distribucion-modo.md)
**Status:** pending  
**Priority:** P0  
**Est. Time:** 2-3h  
**Assignee:** TBD  

Simplify DistribucionService, remove modo validation, simplify create/update methods.

**Depends on:** T-001  
**Blocks:** T-004, T-005, T-006, T-010

---

#### [T-004: Backend - Simplify sale validation](./tasks/T-004-backend-simplify-sale-validation.md)
**Status:** pending  
**Priority:** P0  
**Est. Time:** 2h  
**Assignee:** TBD  

Remove `validarStockEstricto()` and modo-based validation logic from SaleService.

**Depends on:** T-003  
**Blocks:** T-010

---

#### [T-005: Backend - Remove state machine hooks](./tasks/T-005-backend-remove-state-machine-hooks.md)
**Status:** pending  
**Priority:** P0  
**Est. Time:** 1-2h  
**Assignee:** TBD  

Eliminate stock reservation/return hooks from distribucion state machine transitions.

**Depends on:** T-003  
**Blocks:** T-010

---

#### [T-006: Backend - Update sync schemas](./tasks/T-006-backend-update-sync-schemas.md)
**Status:** pending  
**Priority:** P1  
**Est. Time:** 1h  
**Assignee:** TBD  

Update sync operation schemas to remove `modo` field from distribucion create/update.

**Depends on:** T-003  
**Blocks:** T-010

---

### Phase 3: Frontend

#### [T-007: Frontend - Update distribucion types](./tasks/T-007-frontend-update-distribucion-types.md)
**Status:** pending  
**Priority:** P0  
**Est. Time:** 1h  
**Assignee:** TBD  

Update TypeScript types and Zod schemas in frontend to remove modo field.

**Depends on:** T-001  
**Blocks:** T-008

---

#### [T-008: Frontend - Remove modo from forms](./tasks/T-008-frontend-remove-modo-from-forms.md)
**Status:** pending  
**Priority:** P0  
**Est. Time:** 2h  
**Assignee:** TBD  

Simplify create/edit forms, remove hardcoded modo="libre" references.

**Depends on:** T-007  
**Blocks:** T-009

---

#### [T-009: Frontend - Create cierre flow](./tasks/T-009-frontend-create-cierre-flow.md)
**Status:** pending  
**Priority:** P1  
**Est. Time:** 3-4h  
**Assignee:** TBD  

Implement new close-time registration UI with product selection and quantities.

**Depends on:** T-002, T-008  
**Blocks:** T-012

---

### Phase 4: Testing

#### [T-010: Tests - Update distribucion tests](./tasks/T-010-tests-update-distribucion-tests.md)
**Status:** pending  
**Priority:** P1  
**Est. Time:** 2-3h  
**Assignee:** TBD  

Update all affected tests: unit tests, transition tests, integration tests.

**Depends on:** T-004, T-005, T-006  
**Blocks:** T-012

---

#### [T-012: Verification - Integration testing](./tasks/T-012-verification-integration-testing.md)
**Status:** pending  
**Priority:** P1  
**Est. Time:** 2-3h  
**Assignee:** TBD  

End-to-end testing of complete flow: create → sell → close → verify.

**Depends on:** T-009, T-010  
**Blocks:** None (final task)

---

## Execution Order

### Recommended Sequence

1. **Start with T-001** (database) - unblocks everything else
2. **Parallelize backend (T-003→T-006) and frontend types (T-007→T-008)**
3. **T-002 can run in parallel with T-003**
4. **T-009 requires both T-002 and T-008**
5. **T-010 after all backend changes**
6. **T-012 final validation**
7. **T-011 run in production after deployment**

### Parallel Work Streams

```
Stream A (Database):     T-001 → T-002
Stream B (Backend):      T-001 → T-003 → [T-004, T-005, T-006] → T-010
Stream C (Frontend):     T-001 → T-007 → T-008 → T-009
Stream D (Final):        T-009 + T-010 → T-012
```

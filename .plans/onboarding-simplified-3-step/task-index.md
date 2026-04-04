# Task Index: Onboarding Simplificado

## Overview
Este índice contiene todas las tareas necesarias para implementar el onboarding simplificado de 3 pasos.

## Legend
- 🟡 Pending
- 🔵 In Progress
- 🟢 Completed
- ⚫ Blocked

## Tasks

| ID | Task | Status | Owner | Dependencies |
|----|------|--------|-------|--------------|
| T-001 | Crear ruta `/register` con formulario | 🟡 Pending | - | - |
| T-002 | Simplificar formulario `/business/create` | 🟡 Pending | - | - |
| T-003 | Crear página `/onboarding/data` | 🟡 Pending | - | T-002 |
| T-004 | Auto-redirect post-login si no tiene business | 🟡 Pending | - | T-001 |
| T-005 | Crear checklist component en dashboard | 🟡 Pending | - | T-003 |
| T-006 | Backend: endpoint `POST /businesses/seed-demo` | 🟡 Pending | - | - |
| T-007 | Flow invitación con token en registro | 🟡 Pending | - | T-001 |
| T-008 | Testing de integración del flujo completo | 🟡 Pending | - | T-001..T-007 |

## Dependency Graph

```
T-001 (Register) ──┬── T-004 (Auto-redirect)
                   └── T-007 (Invitation flow)

T-002 (Business) ── T-003 (Data selection) ── T-005 (Checklist)

T-006 (Backend seed) ── T-003 (Data selection)

T-001..T-007 ── T-008 (Testing)
```

## Task Details

### Frontend Tasks
- **T-001**: packages/app/app/routes/register.tsx
- **T-002**: packages/app/app/routes/_protected.business.create.tsx
- **T-003**: packages/app/app/routes/_protected.onboarding.data.tsx
- **T-004**: packages/app/app/hooks/use-auth.ts
- **T-005**: packages/app/app/components/dashboard/onboarding-checklist.tsx

### Backend Tasks
- **T-006**: packages/backend/src/api/businesses.ts (add endpoint)
- **T-006**: packages/backend/src/services/business/business.service.ts (add seed method)

### Integration Tasks
- **T-007**: packages/app/app/routes/register.tsx (modify)
- **T-008**: e2e tests

## Key Files to Modify

### Frontend
1. `packages/app/app/routes.ts` - Agregar rutas nuevas
2. `packages/app/app/lib/schemas.ts` - Verificar registerSchema
3. `packages/app/app/routes/login.tsx` - Agregar link a /register
4. `packages/app/app/routes/_protected.dashboard.tsx` - Integrar checklist

### Backend
1. `packages/backend/src/api/businesses.ts` - Agregar endpoint seed-demo
2. `packages/backend/src/services/business/business.service.ts` - Agregar método seedDemoData

## Execution Order

### Phase 1: Foundation (Independent)
1. T-001: Crear `/register`
2. T-002: Simplificar `/business/create`
3. T-006: Backend seed endpoint

### Phase 2: Integration (Depends on Phase 1)
4. T-003: Crear `/onboarding/data`
5. T-004: Auto-redirect
6. T-007: Invitation flow

### Phase 3: Polish
7. T-005: Dashboard checklist
8. T-008: Testing

# Avileo Cocheras Worktree Strategy

## Recommended Worktrees

| Worktree | Suggested Branch | Features | Rationale |
| --- | --- | --- | --- |
| `../avileo-cochera-mode` | `feature/cochera-mode` | F-001 | Keeps shared mode contract edits isolated |
| `../avileo-cochera-subscription` | `feature/cochera-subscription` | F-002 | Subscription is cross-cutting but can be isolated after mode support |
| `../avileo-cochera-config` | `feature/cochera-config` | F-003 | Settings schema/API/UI is a coherent vertical slice |
| `../avileo-cochera-sessions` | `feature/cochera-sessions` | F-004 | Entry/session operations are separable from settings |
| `../avileo-cochera-checkout` | `feature/cochera-checkout` | F-005 | Checkout should wait for settings/session contracts |
| `../avileo-cochera-insights` | `feature/cochera-insights` | F-006, F-007 | Dashboard and reports both read transaction aggregates |
| `../avileo-cochera-onboarding` | `feature/cochera-onboarding` | F-008 | Access/onboarding UX touches different frontend surfaces |
| `../avileo-cochera-qa` | `feature/cochera-qa` | F-009 | QA and seeds should be rebased after feature waves land |

## Central Files to Coordinate

Avoid simultaneous edits to these files across worktrees unless one branch owns the coordination:

- `packages/shared/src/business-modes/schema.ts`
- `packages/shared/src/business-modes/defaults.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/schema.ts`
- `packages/backend/src/app.ts`
- `packages/backend/src/plugins/services.ts`
- `packages/backend/src/db/schema/index.ts`
- `packages/backend/src/db/schema/enums.ts`
- `packages/app/app/routes/_protected.business.create.tsx`
- `packages/app/app/routes/_protected.dashboard.tsx`
- `packages/app/app/routes.ts`

## Merge Guidance

1. Merge `F-001` first.
2. Merge `F-002`, `F-003`, and `F-004` after resolving shared schema/API naming.
3. Merge `F-005` after it validates against subscription/settings/session contracts.
4. Merge `F-006`, `F-007`, and `F-008` once checkout data is stable.
5. Merge `F-009` last or incrementally after each wave if test coverage is split.

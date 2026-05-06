# CocheraPro Feature Dependency Graph

## Dependency Rules

- `F-001` is the foundation because current contracts only recognize existing business modes.
- `F-002`, `F-003`, and `F-004` can start after `F-001`.
- `F-005` depends on:
  - `F-002` for subscription limit enforcement at checkout/monthly transaction boundaries.
  - `F-003` for rates, grace minutes, accepted payment methods, and capacity settings.
  - `F-004` for active vehicle sessions.
- `F-006` and `F-007` depend on completed checkout transactions from `F-005`.
- `F-008` depends on `F-001` for mode selection, `F-002` for plan/access messaging, and `F-003` for first-run setup.
- `F-009` validates the integrated initiative and should follow the major feature waves.

## Graph (ASCII)

```text
                       F-001
                         |
          +--------------+--------------+
          |              |              |
        F-002          F-003          F-004
          |              |              |
          +--------------+--------------+
                         |
                       F-005
                         |
          +--------------+--------------+
          |              |              |
        F-006          F-007          F-008
          |              |              |
          +--------------+--------------+
                         |
                       F-009
```

## Valid Execution Orders

One valid order:

1. `F-001`
2. `F-002`, `F-003`, `F-004`
3. `F-005`
4. `F-006`, `F-007`, `F-008`
5. `F-009`

## Parallelization Analysis

| Feature | Parallelizable | Why |
| --- | --- | --- |
| `F-001` | no | It changes shared business-mode contracts used by all downstream work |
| `F-002` | yes | Subscription contracts can be planned independently after `cochera` mode exists |
| `F-003` | yes | Settings schema/API is independent from active sessions once mode exists |
| `F-004` | yes | Entry/session tables and screens can be planned separately from settings |
| `F-005` | no | It combines subscription, settings, and active session data |
| `F-006` | yes | Dashboard reads aggregate checkout data after `F-005` |
| `F-007` | yes | Reports/export read completed transaction data after `F-005` |
| `F-008` | yes | Onboarding/access UX can run alongside insights after foundation work |
| `F-009` | no | QA/seed coverage needs stable integrated flows |

## Validation Checks

- [x] No circular dependencies
- [x] No dependency references to missing feature IDs
- [x] At least one valid execution order exists
- [x] Every non-foundation feature has a justified dependency path

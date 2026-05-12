# Landing Multi Business Dependency Graph

## Dependency Rules

- `F-001` is the foundation because all copy and section decisions depend on the new multi-negocio positioning.
- `F-002` depends on `F-001` because above-the-fold SEO, hero and navigation need the final message hierarchy.
- `F-003` depends on `F-001` because benefits must consistently express paper removal, accounts, collections and operational relief.
- `F-004` depends on `F-001` because use-case cards/tabs must inherit the same promise and avoid conflicting vertical claims.
- `F-005` depends on `F-004` because the flow visual should know whether the landing uses neutral steps, vertical examples, or both.
- `F-006` depends on `F-001` and `F-004` because social proof, FAQ and final CTA must reinforce the umbrella message and use-case coverage.
- `F-007` depends on all implementation features because QA validates the completed public landing.

## Graph (ASCII)

```text
F-001
  |\
  | \------ F-002
  | \------ F-003
  | \------ F-004
  |           |
  |           F-005
  |
  \-------- F-006
              ^
              |
            F-004

F-002 F-003 F-004 F-005 F-006
   \    |    |    |    /
          F-007
```

## Parallelization Analysis

| Feature | Parallelizable | Why |
| --- | --- | --- |
| `F-001` | no | Establishes shared positioning, vocabulary, and claim boundaries. |
| `F-002` | limited | Can proceed with `F-003`/`F-004` after `F-001`; touches hero/metadata/navigation. |
| `F-003` | yes | Can proceed after `F-001`; mostly features copy and cards. |
| `F-004` | yes | Can proceed after `F-001`; creates the use-case section and may be isolated in one new component plus `landing.tsx`. |
| `F-005` | no | Depends on `F-004` to avoid duplicating or contradicting use-case examples. |
| `F-006` | limited | Can proceed after `F-001` and `F-004`; should avoid final copy before use-case labels are stable. |
| `F-007` | no | Final validation requires all public landing changes. |

## Valid Execution Orders

- Primary: `F-001` → (`F-002`, `F-003`, `F-004`) → (`F-005`, `F-006`) → `F-007`
- Conservative: `F-001` → `F-002` → `F-003` → `F-004` → `F-005` → `F-006` → `F-007`

## Dependency Sanity Check

- [x] No circular dependencies.
- [x] No dependency references to missing feature IDs.
- [x] At least one valid execution order exists.
- [x] Every non-foundation feature has a justified dependency path or explicit reason for being independent.

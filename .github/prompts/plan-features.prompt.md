---
description: >
  Create or refresh an initiative-level feature overview for large projects. The
  output slices work into feature briefs with dependencies, parallelization
  candidates, and worktree recommendations under
  `.plans/<initiative>-overview/`. Use when one request should be split into
  multiple `/plan`-ready feature units.
---

# Feature Planning Overview

Load the `planner` skill and create an initiative-level feature overview for:

`$ARGUMENTS`

## Mission

Produce an initiative overview only. Do not implement code and do not generate
execution-ready implementation plans for each feature in this command.

The final artifacts must live under `.plans/`. If `.plans/` does not exist,
create it before writing.

## Workflow

Follow the `planner` skill strategy end to end, including analysis and
clarification before writing artifacts.

Key command-level constraints:

- Do not write overview artifacts before analysis and clarification are complete.
- Do not stop for intermediate approval once scope is clear.
- If the request is ambiguous, ask only minimum clarifying questions needed.
- If the initiative is broad or cross-domain, delegate discovery to the
  `analyzer` agent, then convert findings into the overview.
- Keep `/plan` compatibility intact: this command creates feature briefs that
  can later be passed to `/plan`, but does not replace `/plan`.

## Fallback Rule

If decomposition collapses to one durable feature-sized unit, do not keep the
initiative overview shape.

In that case:

- explain why the overview was not justified
- recommend using `/plan <request>` directly
- only keep an existing overview when the user explicitly asks to preserve it

## Output Shape

Create or refresh this folder:

- `.plans/<initiative>-overview/`

Required artifacts:

- `.plans/<initiative>-overview/context.md`
- `.plans/<initiative>-overview/feature-index.md`
- `.plans/<initiative>-overview/dependency-graph.md`
- `.plans/<initiative>-overview/worktrees.md`
- `.plans/<initiative>-overview/features/F-00X-<feature-slug>.md`

## Rules for Feature Briefs

Each feature brief must be durable and `/plan`-ready.

Each file under `features/` must include:

- objective
- scope boundaries
- verified context
- assumptions
- likely files or directories involved
- dependencies on other feature IDs
- parallelization notes
- worktree recommendation
- suggested branch/worktree name
- suggested `/plan` mode (`simple` or `structured`)

## Refresh Behavior

If the overview folder already exists, refresh it instead of duplicating it.

When refreshing:

- recompute verified context, dependency graph, and parallelization guidance
- preserve human-owned fields exactly (`Status`, `Owner`, `Decision Notes`,
  `Manual Overrides`)
- update auto-managed fields (`Verified Context`, `Likely Files`,
  `Dependencies`, `Parallelization`, `Worktree Recommendation`) from current
  evidence
- keep stable feature IDs when intent has not materially changed
- explicitly mark added, removed, split, or merged features in
  `feature-index.md`

## Dependency Sanity Check

Before finalizing the overview, validate all of the following:

- no circular dependencies between feature IDs
- no dependencies pointing to missing feature IDs
- at least one valid execution order exists
- every non-foundation feature has a justified dependency path or an explicit
  reason for being independent

## After Planning

Summarize what was created and include copy-paste commands for the next step,
for example:

- `/plan .plans/<initiative>-overview/features/F-001-<feature-slug>.md`
- `/plan .plans/<initiative>-overview/features/F-002-<feature-slug>.md`

---
**Remember**: This command creates the strategic feature map for large
initiatives. Use `/plan` on each generated feature brief to create executable
implementation plans.

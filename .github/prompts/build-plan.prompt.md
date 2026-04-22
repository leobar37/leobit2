---
description: >
  Execute a structured plan created by /plan from `.plans/<plan-name>/` by
  reading `requirements.md`, `task-index.md`, `tasks/*.md`, and
  `checklist.json`, then implementing the work in dependency order.
---

# Build From Structured Plan

Load the `planner` skill before executing the structured plan.

Execute a previously created structured plan.

## Plan Path

`$ARGUMENTS`

If `$ARGUMENTS` is a slug such as `customer-portal-redesign`, resolve it as:

`.plans/customer-portal-redesign/`

If `$ARGUMENTS` is already a path under `.plans/`, use it directly.

## Mission

Implement the code described by a structured plan folder.

This command is intended for plan folders that contain:

- `context.md`
- `requirements.md`
- `task-index.md`
- `tasks/*.md`
- `checklist.json`

Only implement what the structured plan requires. No README files, docs, or
extra scope unless explicitly requested.

Be autonomous. Continue executing through the checklist until the relevant work
is complete whenever possible.

Do not stop to ask the user for intermediate confirmation unless:

- the plan is internally contradictory
- a task file is too ambiguous to implement safely
- a real external decision or user intervention is required
- continuing would risk incorrect or destructive behavior

## Required Workflow

### Phase 1 - Restore Context and Load the Plan

Before editing any files, restore the full context of the plan. This is
critical when running in a new session that has no prior conversation history.

**Step 1 — Read and internalize `context.md`.**

Read `context.md` first. Before continuing, confirm you understand:

- the overall goal of the plan
- what motivated the work
- key architectural or product decisions already made
- what is in scope and out of scope

This is the single most important file for a new session. Everything else
builds on the understanding established here.

**Step 2 — Load the remaining plan artifacts.**

1. Read `requirements.md` to understand the what.
2. Read `task-index.md` to understand ordering and coverage.
3. Use the loaded `planner` skill to create or refresh `./planner-checklist.js` in the current project root when it is missing or stale.
4. Use the project-local planner checklist CLI to recover durable execution state.
5. Read the relevant files under `tasks/*.md`.
6. Build an execution map from task dependencies, completion criteria, validations, and checklist state.

Do not start implementation until the plan structure is understood.

### Phase 2 - Choose Execution Strategy

Use the task files as the source of truth for execution units.

Use `checklist.json` as the durable source of task state, but access it through
the project-local planner checklist CLI whenever possible.

Treat the loaded `planner` skill as the authority for how the helper should
behave and where it should come from.

Determine:

- which task files are blocking prerequisites
- which tasks can run sequentially
- which tasks can be delegated in parallel without overlap
- which validations must happen at the end or between phases

Prefer `Agent` delegation only when plan tasks are isolated enough to have clean
ownership boundaries.

When delegating to an `Agent`, always include the overview from `context.md` in
the agent prompt. Subagents start with no conversation history — without the
plan context they cannot make informed decisions.

### Phase 3 - Track the Real Execution Structure

Use `TaskCreate` and `TaskUpdate` after the execution structure is clear.

Start by running the project-local planner checklist CLI with no arguments to see usage if you
do not already know the available commands.

Use the project-local planner checklist CLI for checklist tracking instead of reading
`checklist.json` directly unless you have a specific debugging reason.

Run it from the project root so it resolves `.plans/` correctly.

Examples:

- `node ./planner-checklist.js`
- `node ./planner-checklist.js list <plan-name>`
- `node ./planner-checklist.js next <plan-name>`
- `node ./planner-checklist.js start <plan-name> T-001`
- `node ./planner-checklist.js complete <plan-name> T-001`

The todo list should reflect the structured plan itself:

- prerequisite task files
- parallelizable task branches when real
- integration tasks
- validation tasks

Do not collapse a structured plan into a fake linear todo list if the plan
contains real branches.

### Phase 4 - Implement From Tasks, Not From Memory

While implementing:

- keep `context.md` as the source of truth for the plan's purpose, motivation, and key decisions
- keep `requirements.md` as the scope boundary
- use the task files as the actionable execution units
- keep checklist state synchronized through the CLI when tasks progress materially
- respect declared dependencies before starting dependent work
- keep changes tightly scoped to the plan
- continue through as much of the checklist as possible without pausing for routine confirmations
- if a task file is too vague to implement safely, stop and ask the user instead of guessing

### Phase 5 - Validate According to the Plan

Run the most relevant checks described or implied by the task files, such as:

- tests
- type checking
- lint
- build
- targeted manual validations

Prefer the validations named in the task artifacts over generic defaults when
they are more specific.

## Output Format

### Execution Strategy
- Plan: [slug or path]
- Mode: [sequential | parallel | hybrid]
- Reasoning: [why this execution path was chosen]

### Tasks Executed
- [task file] - [status or result]
- [task file] - [status or result]

### Files Changed

CREATED:
- `path/to/new/file.ts`

MODIFIED:
- `path/to/modified/file.ts`

DELETED:
- `path/to/deleted/file.ts`

### Validation
- [check]: [result]

### Notes
- mention if task files were executed in parallel
- mention any task file that was skipped, blocked, or needed clarification

## Rules

- ALWAYS read `context.md`, `requirements.md`, `task-index.md`, and the relevant `tasks/*.md` before editing
- ALWAYS load the `planner` skill before bootstrapping or refreshing the local checklist helper
- ALWAYS use the project-local planner checklist CLI to recover and update checklist state when possible
- ALWAYS treat the structured plan as the scope boundary
- USE `TaskCreate`/`TaskUpdate` after understanding the plan's real dependency structure
- USE `Agent` only when structured-plan tasks are isolated enough for delegation
- CONTINUE autonomously until the checklist is materially complete whenever no real blocker exists
- DO NOT stop for intermediate confirmation when the next task is clear and safe to execute
- DO NOT read `checklist.json` directly for normal tracking when the CLI is sufficient
- DO NOT read the checklist script itself unless its behavior is unclear or appears broken
- DO NOT reopen requirements unless the plan is internally contradictory or unsafe to execute
- DO NOT add extra scope beyond the structured plan unless the user explicitly requests it

---
**Note**: This command is for structured plan folders only. For simple `.plans/<name>.md` plans, use `/build` instead.

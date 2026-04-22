---
description: Define a single task from a request without writing plan files.
---

# Define One Task

Load the `planner` skill and define exactly one task for:

`$ARGUMENTS`

## Mission

Create a concise, actionable task brief and stop.

This command is non-durable: do not create files under `.plans/`.

## Rules

- Investigate first using Read, Glob, and Grep before asking questions.
- Define only one task. If decomposition into multiple tasks is needed, recommend `/plan`.
- Do not write or edit files.
- Do not implement code.
- Ask only truly blocking clarification questions.
- End with `Ready to proceed?` and wait.

## Output Format

```markdown
## Task

- Objective: [concrete expected outcome]
- Scope:
  - In: [items]
  - Out: [items]
- Files or Areas: [specific paths or smallest reliable directories]
- Execution: [manual | delegated], [suggested agent or none]
- Dependencies: [none or prerequisite]
- Parallelizable: [yes/no + reason]

## Steps

1. [step]
2. [step]
3. [step]

## Validation

- [checks or observable behavior]

## Open Questions

- [only if truly needed]

Ready to proceed?
```

---
Use `/plan` when the work should be saved as a durable artifact for later delegation or execution.

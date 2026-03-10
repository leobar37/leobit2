---
description: Export conversation context to a concise document for continuing
  work in another context. Saves to @docs/ by default.
---

# /to-task

$ARGUMENTS

Generate a concise document capturing this conversation's context for continuing later.

## Output Path

- If `$ARGUMENTS` contains a path: use it
- Otherwise: generate a descriptive name in `@docs/{descriptive-name}.md`

Name should describe the topic: `implement-auth-jwt.md`, `refactor-payment-module.md`, `fix-form-validation.md`

## Document Structure

```markdown
# {Descriptive title of the work}

## Context

{Summary of current situation. What project are we in? What was being done before this conversation? Any important background?}

## The Problem / Objective

{What is being built, fixed, or investigated? Clear and specific description of this task's goal.}

## Key Decisions

- {Decision 1: what was decided and why}
- {Decision 2: what was decided and why}
- {Decision 3: what was decided and why}

## Files Modified or Created

- `{path/file.ts}` - {what changes were made}
- `{path/other.ts}` - {what changes were made}

## Next Step

{What needs to be done now? One clear, concrete step - not a task list.}

---

Document generated from this conversation
```

## Rules

1. **Descriptive names**: readable, no timestamps
2. **Concise but complete**: all necessary info, nothing extra
3. **No unnecessary technicals**: don't include code, commands, or libraries
4. **Single next step**: the immediate step, not the whole future plan
5. **Real context**: include background if relevant to understanding the problem

## Usage Examples

```
/to-task
→ @docs/implement-auth-system.md

/to-task ./docs/my-task.md
→ ./docs/my-task.md
```

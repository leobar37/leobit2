---
description: Export the current session into an executable handoff for resuming
  later. Saves to @docs/ by default.
---

# /to-task

$ARGUMENTS

Generate an executable handoff document from the current conversation so another future session can continue without re-discovering context, decisions, or next actions.

This is not a conversation summary. It is a continuation artifact.

## Output Path

- If `$ARGUMENTS` contains a path: use it
- Otherwise: generate a descriptive name in `@docs/{descriptive-name}.md`

Name should describe the work itself: `implement-auth-jwt.md`, `refactor-payment-module.md`, `fix-form-validation.md`

## Primary Goal

Produce a document that answers, with minimal fluff:

1. What are we trying to achieve?
2. What is already done?
3. What decisions are already locked in?
4. What files or areas matter next?
5. What exact steps should happen next?
6. How will the next session know the work is correct?

## Document Structure

```markdown
# {Clear task title}

## Objective

{One short paragraph describing the concrete goal of the work. Focus on the outcome, not the story of the conversation.}

## Current State

- Done: {completed work that matters for continuation}
- Remaining: {work that is still missing}
- In progress / partial: {anything started but not finished}
- Blockers or constraints: {only real blockers, constraints, or caveats that affect implementation}

## Decisions Already Made

- {Decision} - {why it was chosen or what alternative was rejected}
- {Decision} - {why it matters for future work}

## Affected Files / Artifacts

- `{path/file.ts}` - {status: changed | review next | create | probable impact} - {why it matters}
- `{path/other.tsx}` - {status: changed | review next | create | probable impact} - {why it matters}

## Execution Plan

1. {Concrete next implementation step with expected outcome}
2. {Next ordered step with scope or file/area reference}
3. {Next ordered step}

## Validation

- Automated: {tests, checks, or commands the next session should run}
- Manual: {user flows or behaviors to verify}
- Acceptance: {observable criteria that confirm the task is done}

## Open Questions / Assumptions

- {Only unresolved questions that materially affect implementation}
- {If no open questions, state the assumptions the next session should preserve}

## Immediate Next Action

{Exactly one concrete action that should be started first in the next session.}

---

Resume by continuing from the execution plan above. Do not re-analyze already settled decisions unless new evidence appears.
```

## Rules

1. **Handoff, not summary**: optimize for continuing work, not retelling the conversation
2. **No generic project context**: do not describe the project, stack, or architecture unless that context changes implementation decisions
3. **Keep only actionable history**: include prior discussion only if it explains a decision, blocker, or constraint
4. **Capture real decisions**: preserve choices already made so the next session does not reopen them
5. **Be explicit about state**: separate what is done, what remains, and what is only partially complete
6. **Use ordered execution steps**: `Execution Plan` must be an actionable sequence, not vague ideas
7. **Add validation every time**: always include how the next session should verify correctness
8. **One immediate action**: `Immediate Next Action` is the first thing to do, while `Execution Plan` covers the broader continuation path
9. **Do not pad**: avoid narrative background, repeated observations, or obvious technical trivia
10. **Do not invent certainty**: if something is unresolved, list it under `Open Questions / Assumptions`

## Do / Don't

### Good

- State which decisions are already locked in
- Mention files and their role in the next steps
- Leave a short ordered plan that another agent can execute immediately
- Include validation and acceptance criteria

### Bad

- Opening with generic project background already obvious from session context
- Writing a retrospective of the conversation
- Listing only one vague "next step" like "continue refactoring"
- Omitting tests, manual checks, or unresolved assumptions

## Output Quality Bar

The document should feel like:

- a precise handoff to yourself tomorrow
- safe for another agent to continue from immediately
- compact, but operational

It should not feel like:

- meeting notes
- a PR description
- a generic recap

## Usage Examples

```
/to-task
→ @docs/implement-auth-system.md

/to-task ./docs/my-task.md
→ ./docs/my-task.md
```

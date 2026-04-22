---
description: >
  Second-pass critical review of an implementation plan. Finds functional
  errors, gaps, warnings,

  and risks before execution. Use after /task, /plan, or any planning
  discussion.

  Triggers: validate, validar, revisar plan, second review, plan review, sanity
  check.
---

# Plan Validation - Second Review

You are a senior engineer performing a **second-pass critical review** of the implementation plan discussed in this conversation.

## Your Mission

Review the current plan with fresh eyes. Find what was missed, challenge assumptions, and verify completeness. Be thorough but balanced: acknowledge strengths while surfacing real problems.

## Context

**Focus area (optional):** $ARGUMENTS

- **With $ARGUMENTS**: Focus your validation on the specified area, but still flag critical issues found elsewhere.
- **Without $ARGUMENTS**: Perform a full validation of the entire plan found in this conversation.

## Step 1: Extract the Plan

Search the conversation history for the implementation plan. This may come from:
- A `/task` or `/plan` command output
- A detailed implementation discussion
- A technical breakdown or step-by-step proposal

If no plan is found, stop and ask: _"I don't see an implementation plan in this conversation. Could you share the plan you'd like me to validate, or run `/task` or `/plan` first?"_

Summarize the plan briefly to confirm your understanding before proceeding.

## Step 2: Validation Checklist

Evaluate the plan against each category below. For each finding, assign a severity:

- **CRITICAL** - Will cause failures, data loss, or broken functionality. Must fix before executing.
- **WARNING** - Potential problem or risk that should be addressed. May work but is fragile.
- **INFO** - Suggestion for improvement. Not blocking but worth considering.
- **OK** - Area reviewed and found solid.

---

### 2.1 Functional Correctness

- Does the logic flow make sense end-to-end?
- Are there contradictions between steps?
- Will the proposed solution actually solve the stated problem?
- Are state transitions and data flows correct?
- Do input/output contracts between components align?

### 2.2 Gaps & Omissions

- Edge cases not covered (empty states, null values, concurrent access, limits)
- Missing validation on inputs or outputs
- Error handling absent or insufficient
- Missing rollback or cleanup logic
- Loading states, optimistic updates, or race conditions not addressed
- Permissions or authorization checks missing from the flow

### 2.3 Technical Risks & Warnings

- Over-engineering or unnecessary complexity
- Performance risks (N+1 queries, unbounded loops, large payloads)
- Scalability concerns
- Potential technical debt being introduced
- Dependencies on unstable or undocumented behavior
- Missing migrations, seeds, or environment setup steps

### 2.4 Integration & Regression

- Conflicts with existing code patterns or conventions
- Breaking changes to existing APIs or interfaces
- Missing backward compatibility considerations
- Dependency ordering issues (circular deps, missing prerequisites)
- Impact on other features or modules not mentioned in the plan

### 2.5 Security

- Authentication or authorization gaps
- Data exposure risks (sensitive data in logs, responses, URLs)
- Input sanitization or injection vectors
- Missing rate limiting or abuse prevention where needed

### 2.6 Completeness

- Are all acceptance criteria from the original task addressed?
- Is the testing strategy adequate?
- Are deployment or migration steps included if needed?
- Is documentation mentioned where necessary?

## Step 3: Strengths

List 2-4 things the plan does well. Be specific:
- Strong architectural decisions
- Good separation of concerns
- Appropriate technology choices
- Well-thought-out edge case handling

## Step 4: Generate Report

### Output Format

```
## Plan Validation Report

### Plan Summary
[2-3 sentence summary of the plan being validated]

### Strengths
- [Specific strength 1]
- [Specific strength 2]

### Findings

#### CRITICAL
- **[Finding title]**
  - **Where in plan:** [Step or section reference]
  - **Issue:** [Clear description of the problem]
  - **Impact:** [What will go wrong if not fixed]
  - **Suggestion:** [Concrete fix or approach]

#### WARNING
- **[Finding title]**
  - **Where in plan:** [Step or section reference]
  - **Issue:** [Description]
  - **Risk:** [What could go wrong]
  - **Suggestion:** [How to address it]

#### INFO
- **[Finding title]**
  - **Where in plan:** [Step or section reference]
  - **Note:** [Observation or suggestion]

### Verdict

[One of the following:]

**VALIDATED** - Plan is solid. No critical issues found. Safe to proceed.

**VALIDATED WITH WARNINGS** - Plan is workable but has [N] warnings that should
be considered. Recommend addressing [specific items] before execution.

**NEEDS REVISION** - Found [N] critical issues that must be resolved before
proceeding. Key blockers: [list critical items briefly].

### Recommended Next Steps
1. [Specific action to address most important finding]
2. [Next action]
3. [...]
```

## Rules

- **DO NOT modify any files or write any code.** This is analysis only.
- **Be balanced**: Acknowledge what's good, don't just list problems.
- **Be specific**: Reference exact steps, files, or components from the plan. Vague feedback is useless.
- **Be actionable**: Every finding must include a concrete suggestion.
- **Prioritize**: Order findings by impact. Critical first, info last.
- **Stay grounded**: Only flag real issues, not hypothetical edge cases with near-zero probability.
- **Respect the plan's scope**: Don't suggest expanding scope beyond the original task requirements.
- **If the plan references code**: Use Grep, Glob, or Read to verify assumptions against the actual codebase.

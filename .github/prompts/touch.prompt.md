---
description: >
  Deep feature audit before implementation. Understand the full feature, detect
  bad code and gaps, diagnose why it fails, and propose the best solution.
  Triggers: touch, diagnosticar, feature audit, root cause, memory leak, react
  issues, gaps, patterns, no funciona.
---

# Touch - Deep Feature Audit

Analyze the feature described in natural language: `$ARGUMENTS`

Your goal is to produce the best possible diagnosis before any implementation.
Do not optimize for token usage. Prefer depth, breadth, evidence, and parallel
investigation when useful.

## Operating Principles

1. Understand the complete feature before concluding anything.
2. Investigate broadly first, then narrow down to the likely root cause.
3. Detect code quality problems before proposing a fix.
4. Launch agents and load skills proactively whenever they improve the result.
5. Do not modify files yet; return analysis and a solution plan first.

## Hard Safety Constraints

- This command is analysis-only.
- Never run tests, builds, linters, package managers, dev servers, Docker, or any
  long-running command.
- Never execute repo-wide validation commands automatically.
- If test coverage is relevant, inspect existing test files and mention which
  tests should be run later, but do not run them.
- Prefer read/search/agent analysis over command execution.
- Only use Bash for lightweight, non-executing inspection when strictly needed.

## Required Execution Flow

### Phase 1 - Full feature discovery

Delegate to the `analyzer` agent to perform comprehensive feature discovery for:

`$ARGUMENTS`

Ask it to:

- map the full feature across frontend, backend, database, tests, and docs
- identify related files, flows, states, services, routes, hooks, and schemas
- assess completeness and mismatches across layers
- return a structured diagnostic report with file references

### Phase 2 - Deep technical audit

Based on the analyzer report, continue with a deeper audit of the most relevant
files and flows. Check for:

- prop drilling
- oversized components
- risky `useEffect` usage
- missing cleanup logic
- memory leaks
- dead code or incomplete branches
- missing validation or error handling
- repo patterns not being followed
- missing tests or weak coverage around the failing behavior
- frontend/backend contract mismatches

### Phase 3 - Proactive agent and skill usage

Use agents and skills at your convenience if they improve the diagnosis or the
quality of the proposal.

- Launch parallel agents when different areas can be analyzed independently.
- Use `explore` for broad codebase discovery.
- Use `general` for parallel deep-dives or cross-layer reasoning.
- Load skills proactively based on what the feature actually needs.
- Do not limit yourself to bug diagnosis only; use skills to expand the final
  proposal when relevant, including areas such as UX, refactor opportunities,
  architecture, onboarding, polish, performance, or maintainability.
- Do not force those topics up front as a static checklist. Bring them into the
  response because the chosen skills surfaced them as relevant.
- Briefly mention which agents or skills were used and why they were useful.

### Phase 4 - Root cause and solution

After understanding the feature and auditing quality:

1. Explain what exists today.
2. Explain what is not working.
3. Identify the most likely root cause with evidence.
4. Distinguish root cause from symptoms and side effects.
5. Detect functional and technical gaps.
6. Propose the best solution before making changes.
7. Include broader recommendations only when supported by the investigation or
   by the skills you used.

## Investigation Rules

- Start from the natural language description in `$ARGUMENTS`.
- Search using synonyms, singular/plural forms, naming variations, and
  English/Spanish terms when relevant.
- If the feature spans frontend and backend, inspect both.
- If the feature is hard to locate, search by domain terms, UI labels, routes,
  API names, hooks, services, and test descriptions.
- Prefer evidence from code over assumptions.
- Ask the user only if there is a real business ambiguity that cannot be
  resolved from the repository.
- Do not run verification commands during the investigation; list them as
  follow-up recommendations instead.

## Output Format

Return a single structured report with:

- feature scope
- files and layers involved
- what was confirmed to exist
- code quality issues detected first
- likely root cause
- gaps found
- recommended solution
- concrete implementation steps
- additional recommendations surfaced by the selected skills, when relevant
- risks, validations, or tests to check before changing code
- agents and skills used

Do not modify files yet. Deliver analysis and solution plan first.
Do not run tests or other heavy commands as part of this command.

---
description: >
  Deep feature audit before implementation using explicit investigation
  orchestration. Understand the feature, detect code quality issues and gaps,
  diagnose likely root cause, and propose the best solution. Triggers: touch-v2,
  deep audit, diagnosticar, root cause, memory leak, react issues, code gaps, no
  funciona.
---

# Touch V2 - Orchestrated Deep Feature Audit

Load the `investigation-orchestrator` skill and analyze the feature described in
natural language:

`$ARGUMENTS`

Your goal is to produce the best possible diagnosis before any implementation.
Prefer depth, breadth, evidence, and explicit investigation structure over fast
but shallow conclusions.

## Operating Principles

1. Understand the complete feature before concluding anything.
2. Investigate broadly first, then narrow down to the likely root cause.
3. Detect code quality problems before proposing a fix.
4. Use the shared investigation skill to decide topology, delegation, and evidence handling.
5. Return analysis and a solution plan only.

## Hard Safety Constraints

- This command is analysis-only.
- Never run tests, builds, linters, package managers, dev servers, Docker, or any long-running command.
- Never execute repo-wide validation commands automatically.
- If test coverage is relevant, inspect existing test files and mention only repository-grounded gaps or relevant existing coverage.
- Do not suggest creating new unit, integration, manual, or E2E test suites unless the investigation finds a critical test gap directly tied to the audited problem.
- Do not recommend creating branches, backups, manual testing plans, or E2E plans unless the user explicitly asks for them.
- Prefer read/search/agent analysis over command execution.
- Only use Bash for lightweight, non-executing inspection when strictly needed.

## Required Execution Flow

### Phase 1 - Orchestrate the investigation

Use the `investigation-orchestrator` skill to:

- inspect the environment before deep investigation
- choose the investigation topology
- decide whether `skills-investigator` should be used to discover relevant skills
- decide whether `Task` delegation would improve coverage
- decide whether `TodoWrite` is justified by the investigation structure
- separate findings into `Verified`, `Inferred`, and `Unknown`

State briefly which orchestration path was chosen and why.

### Phase 2 - Map the feature and current implementation

Start from `$ARGUMENTS` and determine:

- the workflow being audited
- the business outcome expected
- the impacted layers: frontend, backend, contracts, database, tests, docs
- the main entry points and current flow

Then inspect the repository to identify related:

- components, routes, forms, and hooks
- API handlers, services, repositories, and schemas
- state, validation, permissions, and error handling
- tests, docs, and supporting artifacts

If the feature spans multiple fronts, prefer well-bounded delegations over a
single generic subagent.

### Phase 3 - Deep technical audit

After the feature surface is mapped, audit the most relevant files and flows for:

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

Use skills only when they sharpen the diagnosis. Do not force generic add-ons.

### Phase 4 - Root cause and solution

After understanding the feature and auditing quality:

1. Explain what exists today.
2. Explain what is not working.
3. Identify the most likely root cause with evidence.
4. Distinguish root cause from symptoms and side effects.
5. Detect functional and technical gaps.
6. Propose the best solution before making changes.
7. Include broader recommendations only when supported by the investigation.

## Investigation Rules

- Start from the natural language description in `$ARGUMENTS`.
- Search using synonyms, singular/plural forms, naming variations, and English/Spanish terms when relevant.
- If the feature spans frontend and backend, inspect both.
- If the feature is hard to locate, search by domain terms, UI labels, routes, API names, hooks, services, and test descriptions.
- Prefer evidence from code over assumptions.
- Prefer explicit topology decisions over ad hoc delegation.
- Ask the user only if there is a real business ambiguity that cannot be resolved from the repository.
- Do not run verification commands during the investigation.
- Do not turn the report into branch strategy, backup strategy, or manual/E2E testing guidance unless the user explicitly asks for that scope.
- Do not recommend new test suites as generic follow-up work; only call them out when the missing coverage is a material part of the diagnosed risk.

## Output Format

Return a single structured report with:

- request interpretation
- orchestration chosen
- feature scope
- files and layers involved
- verified context
- inferred context
- unknowns
- code quality issues detected first
- likely root cause
- gaps found
- recommended solution
- concrete implementation steps
- additional recommendations surfaced by selected skills, when relevant
- risks and code-grounded validations, when materially supported by the repository
- only mention missing new tests when the absence is critical to the diagnosed issue
- agents and skills used

Make the report diagnostic first and decision-oriented.

The audit is incomplete if it does not explain why subagents or skills were or
were not used.

Do not implement anything as part of this command.

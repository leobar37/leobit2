---
description: >
  Deep business-and-code audit before implementation. Understand what the user
  is trying to achieve, inspect the current implementation, detect concrete
  improvement opportunities, identify gaps and risks, and recommend the best
  next changes. Triggers: audit, feature audit, business audit, detectar
  mejoras, entender negocio, review feature, improvement audit.
---

# Audit - Business and Improvement Review

Load the `investigation-orchestrator` skill and investigate the following
request before implementing anything:

`$ARGUMENTS`

Your job is to understand the business intent behind the request, inspect the
current implementation across the relevant files and layers, detect concrete
improvement opportunities, identify gaps and risks, and recommend the best next
changes.

Do not give a shallow answer and do not jump straight to implementation.

## Goal

Produce a critical audit report that answers:

- what the user appears to be trying to achieve
- what exists today
- how the current implementation supports that business goal
- what is working adequately and should likely be preserved
- what is missing, weak, inconsistent, or hard to evolve
- where concrete improvements exist
- which layer is affected
- where implementation may become difficult
- what approach is actually recommended before changing code

Do not stop at backend feasibility. Always evaluate end-to-end impact whenever
relevant.

## Operating Principles

1. Understand the business intent before proposing technical improvements.
2. Research before proposing implementation.
3. Be critical, not optimistic by default.
4. Explore the existing codebase before using assumptions.
5. Evaluate frontend, backend, contracts, data flow, UX, tests, and docs whenever relevant.
6. Distinguish verified facts, inference, and unknowns.
7. Use the shared investigation skill for topology, delegation, and evidence handling.
8. Prefer repository-grounded recommendations over generic best practices.

## Hard Constraints

- This command is research-only.
- Do not implement code.
- Do not run heavy commands, builds, installs, or dev servers.
- Do not give generic search-style answers.
- Do not say something is easy unless the code supports that conclusion.
- Do not recommend broad rewrites unless the investigation shows they are justified.
- Do not generate vague "nice to have" suggestions unsupported by the repository.

## Required Execution Flow

### Phase 1 - Orchestrate the investigation

Use the `investigation-orchestrator` skill to:

- inspect the environment before deep investigation
- classify the scale of the request:
  - localized
  - cross-layer
  - large-codebase / multi-front
- choose the investigation topology
- decide whether `skills-investigator` would improve skill selection
- decide whether `Task` delegation would improve coverage
- decide whether `TodoWrite` is justified by the investigation structure
- keep evidence separated into `Verified`, `Inferred`, and `Unknown`

Briefly state which orchestration path was chosen and why.

### Phase 2 - Interpret the business intent

Start from the natural language request in `$ARGUMENTS`.

Determine:

- what outcome the user likely wants
- what business or product workflow this relates to
- what success would look like from the user's perspective
- which parts of the current system are probably involved

Do not treat the request as a purely technical prompt. First explain what the
user is trying to accomplish in product or workflow terms.

If the business meaning is partially ambiguous, infer cautiously from the
repository and make uncertainty explicit.

### Phase 3 - Map the current implementation surface

Explore the repository to identify:

- components, routes, forms, hooks, state, and screens
- API handlers, services, repositories, schemas, and business rules
- validation, permissions, loading states, and error handling
- tests, docs, plans, and supporting artifacts
- current flow and entry points
- current limitations implied by the code

Determine:

- which files and layers support the workflow today
- how the current implementation maps to the inferred business goal
- whether important parts of the flow are missing or fragmented

If you have not inspected enough of the environment to justify confidence, the
audit is incomplete.

### Phase 4 - Audit for improvements

After the surface is mapped, inspect the most relevant files and flows for
concrete improvement opportunities in:

- business-flow alignment
- code clarity and maintainability
- oversized components or poor separation of concerns
- prop drilling and state ownership issues
- risky lifecycle or effect handling
- duplication and dead code
- missing validation or weak error handling
- inconsistent repository patterns
- frontend/backend contract mismatches
- unnecessary complexity or weak abstractions
- UX friction, unclear states, or rough interactions
- performance bottlenecks visible from code structure
- weak observability or debugging ergonomics when relevant
- missing or weak coverage around high-risk behavior
- documentation gaps only when they materially affect maintainability or correctness

Separate:

- real problems
- tolerable technical debt
- optional opportunities
- polish-level ideas

### Phase 5 - Evaluate implementation impact

You must explicitly evaluate all relevant layers, especially:

1. Frontend impact
   - what screens, forms, inputs, validations, states, loading, and UX are involved
   - what would need to change if the recommended improvement path is chosen
2. Backend impact
   - what endpoints, services, schemas, jobs, or business rules are involved
   - what would need to change if the recommended improvement path is chosen
3. Contract impact
   - request/response shape, validation, typing, and cross-layer alignment
4. Operational or architectural impact
   - async flows, storage, queues, retries, observability, permissions, or context handoff

Do not leave frontend as an implicit assumption.

### Phase 6 - Use web research or skills only when uncertainty is meaningful

If there is uncertainty about provider capabilities, framework support, library
fit, or current best practice for a difficult pattern, use targeted web
research.

If the relevant skill set is not obvious, use `skills-investigator` instead of
hardcoding unnecessary skill usage.

Skip both when the repository already provides enough confidence.

### Phase 7 - Synthesize the audit

Return a decision-oriented audit report that explains:

1. What the user is likely trying to achieve
2. What exists today
3. What is already working and should likely stay as-is
4. What improvements are actually worth making
5. What makes those improvements harder than they first appear
6. What the recommended next path is before implementation
7. What alternatives and risks remain

## Investigation Rules

- Search with synonyms, English/Spanish wording, singular/plural, and naming variations.
- Prefer evidence from code over intuition.
- Prefer the shared skill's topology rules over ad hoc delegation.
- Prefer targeted web research over generic browsing.
- If you use external sources, summarize only what improves the decision.
- Be explicit when something is only inferred.
- Mention libraries only when they matter to the audit.
- If the request sounds easy, actively check what could complicate it.
- For large codebases, prefer bounded subagent investigations over one giant pass.
- Do not delegate overlapping scopes in parallel.
- When delegating, require concise synthesis rather than raw notes.

## Output Format

Return one structured report with these sections:

- request interpretation
- business understanding
- verified context
- inferred context
- unknowns
- environment and orchestration chosen
- current implementation surface
- strengths worth preserving
- frontend impact
- backend impact
- contract and data-flow impact
- improvement opportunities
- prioritized recommendations by impact / effort / risk
- what already supports the goal
- what is missing for the goal to work better
- implementation challenges
- alternative approaches
- impacted files or layers
- risks and unknowns
- suggested implementation steps
- agents, skills, and web research used

Make the report diagnostic, business-aware, and decision-oriented.

The audit is incomplete if it does not explain why subagents or skills were or
were not used.

Do not implement anything as part of this command.

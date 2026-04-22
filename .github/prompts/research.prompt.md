---
description: >
  Research feasibility before implementation. Investigate what must change,
  where it gets harder, and how the idea impacts frontend, backend, and
  contracts. Triggers: research, investigar, factibility, feasibility, panorama,
  librerias, libraries, approach, viability.
---

# Research - Feasibility and Impact

Load the `investigation-orchestrator` skill and investigate the following idea
before implementing anything:

`$ARGUMENTS`

Your job is to determine what would need to change, what is risky, and what the
real implementation impact would be across the product.

Do not give a shallow "yes, it is possible" answer.

## Goal

Produce a critical feasibility report that answers:

- what exists today
- what must change
- which layer is affected
- where implementation may become difficult
- whether current libraries are enough
- what the frontend, backend, and contracts would need
- what approach is actually recommended

Do not stop at backend feasibility. Always evaluate end-to-end impact.

Example:

- "I want this flow to accept text in addition to an image so it can generate a product"

## Operating Principles

1. Research before proposing implementation.
2. Be critical, not optimistic by default.
3. Explore the existing codebase before using assumptions.
4. Evaluate frontend, backend, API contracts, data flow, and UX whenever relevant.
5. Use web research or skills when uncertainty is meaningful.
6. Distinguish verified facts, inference, and unknowns.
7. Use the shared investigation skill for topology, delegation, and evidence handling.

## Hard Constraints

- This command is research-only.
- Do not implement code.
- Do not run heavy commands, builds, installs, or dev servers.
- Do not give generic search-style answers.
- Do not say something is easy unless the code supports that conclusion.
- Do not skip frontend implications just because the user did not ask explicitly.

## Required Execution Flow

### Phase 1 - Orchestrate the investigation

Use the `investigation-orchestrator` skill to:

- inspect the environment before deep investigation
- choose the investigation topology
- decide whether `skills-investigator` would improve skill selection
- decide whether `Task` delegation would improve coverage
- decide whether `TodoWrite` is justified by the investigation structure
- keep evidence separated into `Verified`, `Inferred`, and `Unknown`

Briefly state which orchestration path was chosen and why.

### Phase 2 - Map the feature surface

Start from the natural language request in `$ARGUMENTS`.

Determine:

- the workflow being changed
- the user inputs and outputs involved
- the business outcome expected
- the impacted layers: frontend, backend, API, prompts/models, storage, tests

Then explore the repository to identify:

- components, routes, forms, API handlers, services, schemas, and tests
- current flow and entry points
- current limitations implied by the code

If you have not inspected enough of the environment to justify confidence, the
research is incomplete.

### Phase 3 - Evaluate implementation impact

You must explicitly evaluate all relevant layers, especially:

1. Frontend impact
   - what screens, forms, inputs, validations, states, loading, and UX must change
   - whether a new requirement changes the interaction model
2. Backend impact
   - what endpoints, services, schemas, jobs, or business rules must change
3. Contract impact
   - request/response shape, validation, typing, provider payloads
4. Operational or architectural impact
   - async flows, storage, queues, retries, observability, permissions

Do not leave frontend as an implicit assumption.

### Phase 4 - Research external panorama when needed

If there is uncertainty about provider capabilities, framework support, or
library fit, use web research.

Typical triggers:

- uncertainty about whether a provider supports multimodal input or structured generation
- uncertainty about how a library handles text-plus-image inputs
- uncertainty about current best practices for a new pattern
- uncertainty about whether a known package solves a difficult part of the request

Otherwise, skip it.

### Phase 5 - Use skills when relevant

Load skills only if they improve confidence or uncover a better path.

If the relevant skill set is not obvious, use `skills-investigator` to discover
which skills are worth loading instead of hardcoding the choice.

### Phase 6 - Library evaluation when doubt is non-trivial

If there is real doubt about whether the current stack supports the idea cleanly,
evaluate whether:

- the libraries already in use are sufficient
- there are hidden capabilities in the current stack that solve the problem
- a lightweight addition would help
- a new dependency would create unnecessary complexity

This is optional and driven by uncertainty.

### Phase 7 - Synthesize the report

Return a report that answers:

1. Is the idea feasible with the current stack?
2. What would have to change to support it?
3. What makes it harder than it first appears?
4. What is the recommended approach?
5. What alternatives and risks remain?

## Investigation Rules

- Search with synonyms, English/Spanish wording, singular/plural, and naming variations.
- Prefer evidence from code over intuition.
- Prefer the shared skill's topology rules over ad hoc delegation.
- Prefer targeted web research over generic browsing.
- If you use external sources, summarize only what improves the decision.
- Be explicit when something is only inferred.
- Mention libraries only when they matter to feasibility.
- If the request sounds easy, actively check what could complicate it.

## Output Format

Return one structured report with these sections:

- request interpretation
- verified context
- inferred context
- environment and orchestration chosen
- current implementation surface
- frontend impact
- backend impact
- contract and data-flow impact
- what already supports the idea
- what is missing for the idea to work
- implementation challenges
- external panorama or library findings, when used
- recommended approach
- alternative approaches
- impacted files or layers
- risks and unknowns
- suggested implementation steps
- agents, skills, and web research used

Make the report decision-oriented.

The research is incomplete if it does not explain why subagents or skills were
or were not used.

Do not implement anything as part of this command.

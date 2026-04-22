---
description: >
  Analyze a feature or functionality in the codebase. Use when you want to
  understand what exists, what's missing, and what issues are present. Triggers:
  analyze, analizar, diagnosticar, feature analysis, codebase analysis,
  miembros, members, colaboradores, collaborators, contratos, contracts.
---

# Feature Analysis Command

Load the `investigation-orchestrator` skill and analyze the feature or
functionality described in natural language:

`$ARGUMENTS`

Your goal is to produce a focused, useful analysis that helps the user understand
the current state of a feature and what to do next.

## Goal

Return a concise analysis that answers:

- what exists today
- which files are involved
- what appears complete versus partial or missing
- where there are concrete issues or risks
- what the most useful next steps are

## Operating Principles

1. Investigate before concluding.
2. Map the feature surface before going deep.
3. Cover only the layers that actually exist or are implicated.
4. Prefer evidence from code over broad assumptions.
5. Distinguish verified facts from inferences.

## Hard Constraints

- This command is analysis-only.
- Do not implement code.
- Do not run tests, builds, package managers, dev servers, or heavy commands.
- Do not force frontend, backend, database, or tests into the report if the
  repository does not support that layer for this feature.

## Required Execution Flow

### Phase 1 - Orchestrate the investigation

Use the `investigation-orchestrator` skill to:

- inspect the environment before deep investigation
- choose the investigation topology
- decide whether `Task` delegation would improve coverage
- decide whether `TodoWrite` is justified by the investigation structure

### Phase 2 - Map the feature surface

Start from `$ARGUMENTS` and determine:

- the workflow being analyzed
- the expected business outcome
- the likely entry points and touchpoints
- the potentially impacted layers: frontend, backend, contracts, database,
  tests, docs

Then inspect the repository to identify related:

- routes, pages, screens, components, forms, hooks, and state
- API handlers, services, repositories, schemas, guards, permissions
- ORM models, migrations, seeds, or persistence artifacts
- tests, docs, and supporting references

Search using synonyms, singular/plural forms, naming variations, and English or
Spanish terms when relevant.

If the feature is narrower than the initial request suggests, explicitly narrow
the scope before deeper analysis.

### Phase 3 - Deep feature analysis

After the surface is mapped, inspect the most relevant files and determine:

- what functionality exists today
- which CRUD or workflow steps are implemented
- which steps are partial, missing, or not found
- whether validation exists
- whether authentication and authorization are enforced when relevant
- whether frontend and backend contracts appear aligned
- whether tests cover the observed behavior when tests exist
- whether the implementation follows repository patterns

Prefer local analysis when the scope is manageable. Use `Task` delegation only
for isolated investigation fronts with clear ownership.

If delegation is used, explain briefly why it improved coverage.

### Phase 4 - Diagnostic report

Return a concise report focused on what matters.

## Investigation Rules

- Start from the natural language description in `$ARGUMENTS`.
- Prefer evidence from file contents over file names.
- Read key files; do not stop at path discovery.
- Be specific with file paths and line numbers when citing important findings.
- If a layer does not appear to exist, state that explicitly instead of forcing
  generic analysis.
- Ask the user only if there is a real business ambiguity that cannot be
  resolved from the repository.

## Output Format

Return a concise, narrative report with these sections:

### Resumen

2-3 oraciones que capturen el estado general: qué existe, qué falta, nivel de
completitud.

### Hallazgos

Lista de puntos clave con ubicaciones específicas:

• `archivo.ts:42` — breve descripción de qué hace o qué problema tiene
• `archivo2.ts:89` — breve descripción
• ...

Incluye tanto capacidades encontradas como issues detectados.

### Recomendaciones

1. Siguiente paso más valioso
2. Segundo paso si aplica (opcional)

## What NOT to Include

- Orchestration details or topology explanations
- Search terms used
- Skills or agents used
- "Verified / Inferred / Unknown" classifications
- File counts or statistics
- Empty sections for layers that don't exist
- "Jump to bottom" links or verbose tables

## Delegation Guidance

You may delegate to the `analyzer` agent, but only after Phase 1 and Phase 2
make the scope and ownership clear.

Use the `analyzer` agent when:

- the feature is genuinely cross-layer
- there are multiple isolated fronts to inspect
- a dedicated inventory pass will improve completeness

Do not use the `analyzer` agent when:

- the feature is localized to one small area
- the repository structure is already clear from local investigation
- delegation overhead is likely higher than the value gained

If you delegate, give the `analyzer` agent a scoped prompt derived from the
mapped feature surface, not just the raw user request.

Do not implement anything as part of this command.

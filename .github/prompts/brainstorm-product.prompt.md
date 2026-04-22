---
description: >
  Brainstorm solutions for a product-level challenge: features, UX flows,
  business rules, user journeys, or functional improvements. Forces idea
  clarification, launches web research and codebase search, and presents
  multiple concrete options. Triggers: brainstorm product, brainstorm producto,
  ideas de producto, product ideas, feature ideas, UX ideas, flujo, journey.
---

# Brainstorm — Product

Generate multiple concrete solution ideas for a product-level challenge.

## Idea

`$ARGUMENTS`

## Mission

You are a creative product advisor, not a linear implementer.

Your job is to **clarify** the user's idea, **investigate** both the codebase and
external patterns, and **present multiple concrete options** — not a single
recommendation.

Do not implement code. Do not write plans. Only ideate.

## Phase 1 — Force Clarification

Before investigating anything, parse `$ARGUMENTS` and identify what is unclear.

Ask the user **2–4 targeted questions** to sharpen the idea. Focus on:

- What user problem or business goal motivates this? (the *why*)
- Who is the target user or persona?
- What does success look like from the user's perspective?
- Are there constraints: existing flows, data model limitations, team capacity?

Do not proceed until the idea is sharp enough to investigate meaningfully.

If `$ARGUMENTS` is already precise and unambiguous, skip to Phase 2.

## Phase 2 — Dual Investigation

Launch two parallel investigations:

### A — Codebase Search

Use `Grep` and `Glob` to map the current implementation surface relevant to the
idea:

- existing screens, components, routes, forms
- current user flows and state management
- API endpoints, services, and data models involved
- validation rules and business logic

### B — External Research

Use web search to investigate:

- how other products solve this same problem
- common UX patterns for this type of flow
- best practices or anti-patterns in this domain
- any relevant industry standards

Use `Agent` for the web research when it requires multiple searches or deep
exploration.

## Phase 3 — Synthesize Ideas

Using both investigation streams, generate **3–5 distinct solution ideas**.

For each idea:

```
### Idea [N]: [Short Name]

**User story:** As a [user], I want to [action] so that [outcome].

**How it works:** [2-3 sentences explaining the flow from the user's perspective]

**Key changes:**
- [UX or functional change 1]
- [UX or functional change 2]

**Pros:**
- [advantage grounded in research or codebase findings]

**Cons:**
- [trade-off, risk, or complexity]

**Effort:** [low | medium | high]

**Evidence:** [which finding supports this — internal pattern or external example]
```

Ideas should represent genuinely different approaches to the same problem. At
least one should be a quick win (minimal scope) and at least one should be a
rethink of the current approach.

## Phase 4 — Present and Let the User Choose

After presenting the ideas:

- Rank them by your recommended order, but do not force a choice
- Suggest the natural next step for the chosen idea:
  - `/plan <chosen idea>` to create an implementation plan
  - `/critique <chosen idea>` to stress-test it
  - `/research <chosen idea>` for deeper feasibility

## Rules

- ALWAYS clarify before investigating (unless the idea is already precise)
- ALWAYS investigate both the codebase and external patterns
- ALWAYS present 3–5 distinct ideas, not a single recommendation
- ALWAYS include a user story for each idea
- ALWAYS ground ideas in findings, not generic product advice
- DO NOT implement code
- DO NOT create plans or task lists
- DO NOT skip the clarification phase to seem faster

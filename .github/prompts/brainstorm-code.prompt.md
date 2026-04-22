---
description: >
  Brainstorm solutions for a code-level problem: architecture, patterns,
  refactors, abstractions, or implementation approaches. Forces idea
  clarification, launches codebase analysis, and presents multiple concrete
  options. Triggers: brainstorm code, brainstorm codigo, ideas de codigo, code
  ideas, refactor ideas, architecture ideas.
---

# Brainstorm — Code

Generate multiple concrete solution ideas for a code-level challenge.

## Idea

`$ARGUMENTS`

## Mission

You are a creative technical advisor, not a linear implementer.

Your job is to **clarify** the user's idea, **investigate** the codebase for
evidence, and **present multiple concrete options** — not a single recommendation.

Do not implement code. Do not write plans. Only ideate.

## Phase 1 — Force Clarification

Before investigating anything, parse `$ARGUMENTS` and identify what is unclear.

Ask the user **2–4 targeted questions** to sharpen the idea. Focus on:

- What specific pain point or goal motivates this? (the *why*)
- What part of the codebase is involved? (scope boundaries)
- Are there constraints: performance, backwards compat, team conventions?
- What does "better" look like for this case?

Do not proceed until the idea is sharp enough to investigate meaningfully.

If `$ARGUMENTS` is already precise and unambiguous, skip to Phase 2.

## Phase 2 — Codebase Analysis

Launch an `Agent` with `subagent_type: "analyzer"` to investigate the relevant
codebase area. The agent should:

- map the current implementation surface (files, patterns, dependencies)
- identify existing abstractions, utilities, or patterns that relate
- detect pain points: duplication, coupling, complexity, inconsistency
- note what works well and should be preserved

Also use `Grep` and `Glob` directly for targeted searches when the agent scope
is too broad.

## Phase 3 — Synthesize Ideas

Using the analysis findings, generate **3–5 distinct solution ideas**.

For each idea:

```
### Idea [N]: [Short Name]

**How it works:** [2-3 sentences explaining the approach]

**Key changes:**
- [concrete change 1]
- [concrete change 2]

**Pros:**
- [advantage grounded in analysis findings]

**Cons:**
- [trade-off or risk]

**Effort:** [low | medium | high]

**Evidence:** [which analysis finding supports this idea]
```

Ideas should be genuinely different approaches, not minor variations of the same
thing. At least one idea should be conservative (minimal change) and at least one
should be ambitious (rethink the approach).

## Phase 4 — Present and Let the User Choose

After presenting the ideas:

- Rank them by your recommended order, but do not force a choice
- Suggest the natural next step for the chosen idea:
  - `/plan <chosen idea>` to create an implementation plan
  - `/critique <chosen idea>` to stress-test it
  - `/research <chosen idea>` for deeper feasibility

## Rules

- ALWAYS clarify before investigating (unless the idea is already precise)
- ALWAYS launch the `analyzer` agent for codebase evidence
- ALWAYS present 3–5 distinct ideas, not a single recommendation
- ALWAYS ground ideas in analysis findings, not generic advice
- DO NOT implement code
- DO NOT create plans or task lists
- DO NOT use `TodoWrite` — use `TaskCreate`/`TaskUpdate` only if tracking phases
- DO NOT skip the clarification phase to seem faster

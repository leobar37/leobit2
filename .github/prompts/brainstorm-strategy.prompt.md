---
description: >
  Brainstorm high-level strategic decisions: architectural direction, technical
  roadmap, scaling approaches, or cross-cutting trade-offs. Forces idea
  clarification, launches all available analysis agents in parallel, and
  presents multiple concrete strategic options. Triggers: brainstorm strategy,
  brainstorm estrategia, strategic ideas, architecture decision, roadmap ideas,
  scaling ideas, trade-offs, decisiones tecnicas.
---

# Brainstorm — Strategy

Generate multiple concrete strategic options for a high-level technical decision.

## Idea

`$ARGUMENTS`

## Mission

You are a strategic technical advisor.

Your job is to **clarify** the user's decision, **investigate comprehensively**
using all available analysis channels, and **present multiple concrete strategic
options** — not a single recommendation.

Do not implement code. Do not write plans. Only ideate.

## Phase 1 — Force Clarification

Before investigating anything, parse `$ARGUMENTS` and identify what is unclear.

Ask the user **2–4 targeted questions** to sharpen the decision. Focus on:

- What is the strategic goal or pressure driving this? (the *why*)
- What is the time horizon: short-term fix or long-term direction?
- What are the hard constraints: team size, budget, existing commitments?
- What trade-offs is the user already aware of?

Do not proceed until the decision space is sharp enough to investigate.

If `$ARGUMENTS` is already precise and unambiguous, skip to Phase 2.

## Phase 2 — Comprehensive Investigation

Launch **all analysis channels in parallel** using `Agent`:

### A — Codebase Analysis

Launch an `Agent` with `subagent_type: "analyzer"` to map the current state:

- overall architecture and module boundaries
- existing patterns, conventions, and abstractions
- coupling points and integration surfaces
- current pain points visible in the code

### B — External Research

Launch an `Agent` for web research to investigate:

- how other teams or products have approached this decision
- industry patterns, case studies, or post-mortems
- emerging trends relevant to the decision
- known failure modes for each direction

### C — Skills Discovery

Launch an `Agent` with `subagent_type: "skills-investigator"` to check if any
installed skill provides domain-specific insight relevant to the decision.

All three agents should run in parallel when independent.

## Phase 3 — Synthesize Strategic Options

Using all investigation streams, generate **3–5 distinct strategic options**.

For each option:

```
### Option [N]: [Strategic Direction Name]

**Vision:** [1-2 sentences — what the system looks like if this path succeeds]

**Approach:** [3-5 sentences explaining the strategy and key moves]

**Key decisions it implies:**
- [downstream decision 1]
- [downstream decision 2]

**Pros:**
- [advantage grounded in investigation findings]

**Cons:**
- [trade-off, risk, or cost]

**Effort:** [low | medium | high]

**Time horizon:** [weeks | months | quarters]

**Reversibility:** [easy to reverse | hard to reverse | one-way door]

**Evidence:** [which finding supports this — codebase pattern, external case study, skill insight]
```

Options should span a range of ambition:

- at least one **incremental** option (evolve current approach)
- at least one **transformative** option (fundamentally change direction)
- at least one **hybrid** option (staged migration or phased approach)

## Phase 4 — Present and Let the User Choose

After presenting the options:

- Rank them by your recommended order, but do not force a choice
- Call out the **key trade-off axes** (e.g., "speed vs. correctness", "short-term velocity vs. long-term maintainability")
- Highlight which options are **one-way doors** vs. reversible
- Suggest the natural next step for the chosen option:
  - `/plan <chosen option>` to create an implementation plan
  - `/critique <chosen option>` to stress-test the strategy
  - `/research <chosen option>` for deeper feasibility

## Rules

- ALWAYS clarify before investigating (unless the decision is already precise)
- ALWAYS launch all three investigation channels (analyzer, web research, skills)
- ALWAYS present 3–5 distinct options, not a single recommendation
- ALWAYS include reversibility and time horizon for each option
- ALWAYS ground options in investigation findings, not abstract strategy talk
- DO NOT implement code
- DO NOT create plans or task lists
- DO NOT skip the clarification phase to seem faster
- DO NOT present options without evidence from at least one investigation channel

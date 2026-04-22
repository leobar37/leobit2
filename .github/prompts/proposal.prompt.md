---
description: >
  Synthesize a clear solution proposal from a recent problem, error, task,
  investigation, or analysis. Returns a concrete recommended approach with
  rationale, alternatives, risks, and improvements — without executing anything.
  Triggers: proposal, propuesta, propose a solution, cómo resolvería esto, qué
  propones, qué sugieres, cómo lo harías, cuál es la mejor opción.
---

# /proposal - Solution Proposal

Synthesize a solution proposal from the current conversation context.

## Topic

$ARGUMENTS

---

## Instructions

Analyze the provided topic (or the most recent problem/task from the conversation) and generate a clear solution proposal.

### Step 1 — Understand the Context

- With `$ARGUMENTS`: Use the provided topic as focus.
- Without `$ARGUMENTS`: Identify the most recent problem, error, task, or analysis in this conversation.
- If no clear problem exists, ask the user to clarify what they want a proposal for.

### Step 2 — Synthesize the Proposal

Return a structured proposal with these sections:

```
## Problema

[2-3 sentence framing of the problem, error, or task to solve]

## Propuesta Recomendada

[Concrete step-by-step solution — what to do, in what order]

### Por qué esta aproximación
[1-2 sentences explaining the reasoning]

### Alternativas Considered
- **[Alternative 1]**: [brief description] → [why rejected or less preferred]
- **[Alternative 2]**: [brief description] → [why rejected or less preferred]

### Riesgos y Consideraciones
- **[Risk 1]**: [description] → [mitigation or watch-out]
- **[Risk 2]**: [description] → [mitigation or watch-out]

### Mejoras Sugeridas
- [Improvement 1]
- [Improvement 2]

### Siguiente Paso Recomendado
[The single most important first action to take]
```

### Step 3 — Constraints

- **DO NOT** implement code, run commands, or modify files.
- **DO NOT** run tests, builds, linters, or heavy inspection unless trivial.
- Stay grounded in evidence from the conversation or the codebase.
- Be direct and concise — proposal quality over length.
- If the context is too thin to produce a confident proposal, ask for clarification.

### Remember

This command produces a proposal only. Use `/build` or `/build-v2` after approving the proposal to execute it.

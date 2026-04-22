---
description: >
  Create or improve a skill. Triggers skill-maker to analyze, propose, and wait
  for approval before creating or modifying files. Use for new skills from
  features/workflows or improving existing skills. Triggers: create skill,
  create-skill, improve skill, update skill, new skill, make skill, crear skill.
---

# Create Skill

Create or improve a skill from a feature, workflow, or existing skill path.

## Request

$ARGUMENTS

## Execution

**Invoke skill-maker** to handle this request.

The skill-maker skill will:

1. **Detect mode**: New skill or existing skill improvement
2. **Analyze**: Explore repo or read current skill
3. **Propose**: Present goal, name, coverage, structure
4. **Wait**: STOP and ask for approval
5. **Execute**: Only after approval, create or improve

---
description: PLANNING ONLY - Analyze tasks and create execution plans without
  making any changes (use /build to execute)
---

# Task Planning

Intelligently delegate planning tasks to the appropriate agent based on complexity and requirements.

## Planning Strategy

### Use `prd-functional-expert` (Phase Orchestrator) when:
- Task requires multiple specialized agents
- Complex multi-phase execution needed
- Need to analyze which agents should handle each phase
- Task involves orchestration across different domains
- Keywords: "orchestrate", "phases", "assign agents", "multi-phase", "complex feature"

**Capabilities:**
- Discovers available agents automatically
- Decomposes tasks into phases with agent assignments
- Invokes agents for file impact analysis
- Produces structured execution guides with commands
- Handles complexity level 3-5 tasks

### Use `planner` agent when:
- Single-domain planning required
- Direct execution plan needed
- Task-specific file analysis
- Straightforward implementation path
- Keywords: "plan", "analyze", "execution plan", "simple task"

**Capabilities:**
- Task-specific codebase analysis
- Detailed execution steps with file references
- Architecture integration planning
- Risk and consideration assessment
- Handles complexity level 1-3 tasks

## Decision Logic

1. **Assess task complexity**:
   - Multi-domain or requires multiple agent types? → `prd-functional-expert`
   - Single-domain or straightforward? → `planner`

2. **Check for orchestration needs**:
   - Needs phase-by-phase agent assignment? → `prd-functional-expert`
   - Needs direct file-level implementation plan? → `planner`

3. **Default**: When in doubt, use `planner` for simpler tasks

## User Request
$ARGUMENTS

---
**Remember**: This command is for PLANNING ONLY. Use `/build` to execute the plan.

---
description: Expand plan with technical details and agent delegation
---

# Technical Refinement

You are refining a previously created plan from the `/task` command. Your goal is to:

1. **Deepen technical details** for each step
2. **Discover available sub-agents** in the system
3. **Map tasks to appropriate agents** for delegation
4. **Provide executable commands** for task execution
5. **Identify dependencies** and optimal execution order

## Step 1: Analyze Available Sub-Agents

First, discover what specialized agents are available in the system:

**Available agents in the system:**
!`find /Users/leobar37/.config/opencode/agent -name "*.md" -type f 2>/dev/null | head -20`

**Agent configurations:**
!`for file in /Users/leobar37/.config/opencode/agent/*.md; do echo "=== $(basename "$file") ==="; head -20 "$file" 2>/dev/null; echo ""; done`

Parse each agent's:
- Name (from filename)
- Description (from YAML frontmatter)
- Capabilities (from description keywords)
- Specialization domain

## Step 2: Review Original Plan Context

Analyze the conversation history to extract:
- Original task/goal
- High-level plan steps from `/task` command
- Current implementation status
- Known constraints or requirements

**Current conversation context should contain the plan from `/task`.**

## Step 3: Technical Breakdown

For EACH step in the original plan, provide:

### Step [N]: [Step Name]

**Objective:**
[Clear, specific goal of this step]

**Implementation Details:**
- Specific approach: [detailed technical approach]
- Files to modify/create: [exact file paths]
- Functions/APIs to use: [specific names with signatures]
- Design patterns: [which patterns apply, with examples]

**Code References:**
- Similar implementations: [reference existing code in codebase]
- Reusable utilities: [existing functions that can help]
- Patterns to follow: [architectural patterns from codebase]

**Technical Considerations:**
- Edge cases: [specific scenarios to handle]
- Performance: [optimization opportunities]
- Security: [security implications if any]
- Testing: [what tests are needed]

**Delegation Analysis:**
- Can delegate: [YES/NO]
- Best agent: [agent-name] or "Manual"
- Reasoning: [why this agent or why manual]
- Confidence: [high/medium/low]

**Complexity & Estimates:**
- Complexity: [low/medium/high]
- Estimated time: [X minutes/hours]
- Risk level: [low/medium/high]
- Dependencies: [list prerequisite steps]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

---

## Step 4: Sub-Agent Capability Matrix

Based on discovered agents, create a mapping:

### Available Sub-Agents

| Agent Name | Specialization | Applicable Steps | Confidence |
|------------|----------------|------------------|------------|
| [agent-1]  | [domain]       | Steps [X, Y]     | [high/med] |
| [agent-2]  | [domain]       | Steps [Z]        | [high/med] |

**Detailed Agent Analysis:**

#### [Agent Name 1]
- **Capabilities:** [parsed from agent description]
- **Best for:** [types of tasks]
- **Can handle steps:** [step numbers and names]
- **Invocation example:**
  ```
  /task prompt="[specific instruction for this agent]" subagent_type="[agent-name]"
  ```

#### [Agent Name 2]
- **Capabilities:** [parsed from agent description]
- **Best for:** [types of tasks]
- **Can handle steps:** [step numbers and names]
- **Invocation example:**
  ```
  /task prompt="[specific instruction for this agent]" subagent_type="[agent-name]"
  ```

## Step 5: Dependency Analysis

**Dependency Graph:**

```
Step 1 (independent)
  |
Step 2 (requires Step 1)
  |
Step 3 (requires Step 2) <- parallel -> Step 4 (requires Step 2)
  |
Step 5 (requires Steps 3 & 4)
```

**Critical Path:** [identify the longest dependency chain]

**Parallelizable Steps:** [list steps that can run concurrently]

**Blocking Steps:** [steps that block multiple downstream tasks]

## Step 6: Execution Strategy

### Optimal Execution Order

**Phase 1: Foundation** (Sequential)
1. Step [X]: [name] - [manual/agent-name]
2. Step [Y]: [name] - [manual/agent-name]

**Phase 2: Parallel Development** (Can run concurrently)
- Step [A]: [name] - [manual/agent-name]
- Step [B]: [name] - [manual/agent-name]

**Phase 3: Integration** (Sequential)
1. Step [Z]: [name] - [manual/agent-name]

### Delegation Summary

**Manual Implementation Required:**
- Step [N]: [reason why manual]
- Step [M]: [reason why manual]

**Delegable to Sub-Agents:**
- Step [X] -> [agent-name]: [brief reasoning]
- Step [Y] -> [agent-name]: [brief reasoning]

**Hybrid Approach:**
- Step [Z]: Start with [agent-name], then manual refinement

## Step 7: Ready-to-Execute Commands

### Executable Task Commands

For each delegable step, provide the exact command:

**Step [N]: [Step Name]**
```
/task prompt="[Detailed, specific instruction for the agent including:
- Exact goal
- Files to modify
- Patterns to follow
- Acceptance criteria
- Context from previous steps]" subagent_type="[agent-name]"
```

**Step [M]: [Step Name]**
```
/task prompt="[Detailed instruction...]" subagent_type="[agent-name]"
```

## Step 8: Risk Assessment

**High-Risk Areas:**
- [Area 1]: [risk description] - Mitigation: [strategy]
- [Area 2]: [risk description] - Mitigation: [strategy]

**Medium-Risk Areas:**
- [Area 3]: [risk description] - Mitigation: [strategy]

**Low-Risk Areas:**
- [Area 4]: [description]

## Step 9: Success Metrics

**Definition of Done:**
- [ ] All acceptance criteria met for each step
- [ ] Tests passing (unit, integration, e2e as applicable)
- [ ] Code review completed
- [ ] Documentation updated
- [ ] No regressions introduced

**Quality Gates:**
- Code coverage: [target %]
- Performance benchmarks: [specific metrics]
- Security scan: [pass/fail criteria]

## Final Output Format

---

# TECHNICAL REFINEMENT COMPLETE

## Original Plan Summary
[Brief 2-3 sentence recap of the /task plan]

## Technical Breakdown
[All steps with full technical details as specified above]

## Sub-Agent Delegation Map
[Clear mapping of steps to agents]

## Execution Strategy
[Optimal order with phases]

## Ready-to-Execute Commands
[Copy-paste ready commands for delegation]

## Risk Assessment
[Key risks and mitigations]

## Success Criteria
[Clear definition of done]

---

**Ready to proceed with execution?**

Choose your approach:
1. **Full Delegation:** Execute all delegable commands in sequence
2. **Hybrid:** Delegate some, implement others manually
3. **Manual:** Use this as a detailed implementation guide

**Next Steps:**
- Review the technical breakdown
- Validate agent assignments
- Execute commands in the proposed order
- Monitor progress against acceptance criteria

---

## Instructions for AI Processing

**Context Requirements:**
- This command assumes `/task` was executed previously in the conversation
- Extract the original plan from conversation history
- If no plan found, ask user to run `/task` first

**Agent Discovery Process:**
1. List all `.md` files in `/Users/leobar37/.config/opencode/agent/`
2. Read YAML frontmatter from each agent file
3. Extract `description` field for capability analysis
4. Parse keywords: test, build, deploy, refactor, document, analyze, etc.
5. Match keywords to plan step requirements

**Technical Depth Requirements:**
- Be specific: use exact file paths, function names, API endpoints
- Reference existing code: find similar patterns in codebase
- Provide examples: show code snippets where helpful
- Consider edge cases: think through error scenarios
- Estimate realistically: base time estimates on complexity

**Delegation Decision Criteria:**
- Agent has clear capability match (keywords align)
- Task is well-defined and isolated
- Agent description indicates relevant expertise
- Confidence is medium-high based on description match

**Output Quality Standards:**
- Use consistent markdown formatting
- Include all sections specified above
- Provide actionable, executable commands
- Be thorough but concise
- Optimize for AI readability and human clarity

**Error Handling:**
- If no agents found: note that all steps require manual implementation
- If plan unclear: ask for clarification before refining
- If agent capabilities ambiguous: mark as "manual" with low confidence

---

**Remember:** This refinement should transform a high-level plan into an executable, technically detailed roadmap with clear delegation opportunities and ready-to-use commands.

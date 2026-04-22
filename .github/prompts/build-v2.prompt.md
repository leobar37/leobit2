---
description: Intelligently execute work by splitting it into sequential and
  parallel task phases
---

# Build V2

Execute a requested implementation intelligently.

Do not jump straight into coding. First determine how to split the work, identify dependencies, and decide whether parts should be executed manually, through subagent tasks in parallel, or in sequence.

IMPORTANT: Only implement what was requested. Do not add README files, docs, or extra scope unless explicitly asked.

## User Request
$ARGUMENTS

## Core Behavior

You are an execution orchestrator, not just a linear implementer.

For every request:

1. Analyze the task before editing files.
2. Break the work into concrete execution units.
3. Decide which units are:
   - sequential because they have dependencies
   - parallelizable because they are isolated
   - better handled manually in the current session
   - better delegated to subagent tasks
4. Execute the plan in the smartest order.
5. Validate the final result.

## Phase 1: Analyze and Fragment the Work

Before making changes, determine:

- the main objective
- the affected files and systems
- the dependency chain between steps
- which steps block other steps
- which steps can run independently
- whether subagent delegation will reduce risk or improve speed

Create a short internal execution map with:

- execution units
- dependency notes
- parallelization opportunities
- validation requirements

## Phase 2: Decide the Execution Mode

Choose the best execution pattern for the task.

### Use manual direct execution when:
- the task is small and localized
- only one or two files are involved
- delegation overhead is higher than implementation cost
- the work requires tight local iteration

### Use sequential execution when:
- one step depends on outputs from another
- schema, contract, or architecture decisions must be made first
- later steps would likely be reworked if started early
- validation of an earlier phase is required before continuing

### Use parallel task delegation when:
- work can be split into isolated units
- files or domains do not overlap significantly
- one agent can explore or implement one area while another handles a different area
- the results can be merged cleanly afterward

### Use a hybrid approach when:
- a foundation step must be done first
- downstream steps can then run in parallel
- final integration or cleanup must return to the main session

## Phase 3: Launch Tasks Intelligently

If delegation is useful, use the `Agent` tool to launch subagents.

When launching tasks:

- provide explicit scope
- name exact files or directories when known
- include acceptance criteria
- state constraints and patterns to follow
- avoid overlapping ownership across parallel tasks

Prefer parallel task launches only when the tasks are truly independent.

Examples of good parallelization:
- backend API work and frontend UI work after the contract is clear
- separate isolated refactors in different folders
- analysis of different subsystems before integration

Examples that should stay sequential:
- database schema before repository updates
- API contract before frontend consumption
- shared utility refactor before dependent feature changes

## Phase 4: Track Execution

Use `TaskCreate` and `TaskUpdate` to track the execution plan after fragmentation is complete.

The todo list should reflect the real execution structure, for example:
- a foundation phase
- one or more parallelizable branches
- an integration phase
- a validation phase

Do not create a fake linear todo list if the task is actually parallelizable.

## Phase 5: Implement

Execute according to the chosen strategy:

- complete blocking prerequisites first
- launch independent tasks in parallel when beneficial
- integrate delegated results carefully
- resolve conflicts or overlaps before validation
- keep changes tightly scoped to the request

If the task turns out to be smaller than expected, simplify and execute directly.

If the task turns out to be more coupled than expected, stop parallelization and continue sequentially.

## Phase 6: Validate

Run the most relevant checks for the affected area, such as:

- tests
- lint
- type checking
- build
- targeted verification commands

Choose validation based on what changed. Do not skip verification when a meaningful check is available.

## Output Format

### Execution Strategy
- Objective: [what is being built]
- Mode: [manual | sequential | parallel | hybrid]
- Reasoning: [why this mode was chosen]

### Execution Units
- Unit 1: [description] - [manual or delegated]
- Unit 2: [description] - [depends on Unit X or parallel]

### Files Changed

CREATED:
- `path/to/new/file.ts`

MODIFIED:
- `path/to/modified/file.ts`

DELETED:
- `path/to/deleted/file.ts`

### Validation
- [check]: [result]

### Notes
- mention if tasks were launched in parallel
- mention if the execution plan had to change during implementation
- mention any remaining follow-up only if relevant

## Rules

- ALWAYS analyze and fragment the work before implementation
- ALWAYS decide whether execution should be manual, sequential, parallel, or hybrid
- USE `Agent` tool when delegation is clearly beneficial
- USE parallel `Agent` launches only for isolated work
- USE sequential execution when dependencies are real
- USE `TaskCreate`/`TaskUpdate` after the execution structure is clear
- VALIDATE the final result with appropriate checks
- NO extra scope, docs, or README changes unless requested

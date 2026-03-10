---
description: Execute the plan from /plan command or implement simple tasks directly
---

# Execute Plan or Task

Execute a previously generated plan OR implement a task directly.

⚠️ **IMPORTANT**: Only implement what's requested - no README.md or extras unless explicitly asked.

## Task/Modifications:
$ARGUMENTS

## Execution Process

### 1. Create TODO List
- **ALWAYS** use `TodoWrite` tool to create a TODO list from:
  - Existing plan (if created by `/plan`)
  - OR $ARGUMENTS (parse requirements into actionable items)
- Mark items as you progress: `pending` → `in_progress` → `completed`

### 2. Implementation
- Follow the TODO list in dependency order
- Create new files before modifying existing ones
- Group related changes together
- Mark each TODO as completed immediately cafter finishing

### 3. Validation
- Run type checking, linting, or tests if applicable
- Mark validation TODO as completed

## Output Format

### **Files Changed**

**CREATED:**
- `path/to/new/file.ts`

**MODIFIED:**
- `path/to/modified/file.ts`

**DELETED:**
- `path/to/deleted/file.ts`

### **Validation**
- ✅ Type checking: [result]
- ✅ Tests: [result]

## Rules
- ✅ **ALWAYS CREATE TODO LIST** - Use TodoWrite at the start
- ✅ **TRACK PROGRESS** - Mark TODOs as in_progress/completed
- ✅ **EXECUTE EFFICIENTLY** - Follow the TODO list systematically
- ✅ **NO EXTRAS** - No README.md or documentation unless requested
- ✅ **VALIDATE** - Run checks after implementation

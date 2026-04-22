---
description: Execute the plan from /plan command or implement simple tasks directly
---

# Execute Plan or Task

Execute a previously generated plan OR implement a task directly.

⚠️ **IMPORTANT**: Only implement what's requested - no README.md or extras unless explicitly asked.

## Task/Modifications:
$ARGUMENTS

## Execution Process

### 1. Resolve Input
- If `$ARGUMENTS` points to a structured plan folder under `.plans/`, use `/build-plan` instead.
- If `$ARGUMENTS` points to a simple plan file under `.plans/`, execute that plan as the source of truth.
- Otherwise, treat `$ARGUMENTS` as a direct implementation request.

### 2. Build an Execution Map
- Derive concrete execution steps before editing files.
- Keep dependency order explicit.
- Use `TaskCreate` and `TaskUpdate` only when multi-step tracking adds real value.

### 3. Implementation
- Follow the task list in dependency order
- Create new files before modifying existing ones
- Group related changes together
- If tracking was created, mark each task as completed immediately after finishing

### 4. Validation
- Run type checking, linting, or tests if applicable
- If tracking was created, mark validation as completed

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
- **USE THE RIGHT SOURCE** - Simple plan file when provided, otherwise `$ARGUMENTS`
- **TRACK ONLY WHEN USEFUL** - Use `TaskCreate`/`TaskUpdate` for meaningful multi-step execution
- **EXECUTE EFFICIENTLY** - Follow the task list systematically
- **NO EXTRAS** - No README.md or documentation unless requested
- **VALIDATE** - Run checks after implementation

---
**Note**: For structured plan folders (`.plans/<name>/`), use `/build-plan` instead.

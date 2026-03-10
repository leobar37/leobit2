---
description: Analyze a directory and generate/update an AGENTS.md file with
  contextual knowledge about the codebase patterns, architecture, and key
  information
---

# Learn Directory Context

Analyze the specified directory and generate or update an AGENTS.md file with comprehensive contextual knowledge.

## Target Directory
$ARGUMENTS

## Your Mission

You are a **context extraction specialist**. Your job is to deeply analyze the provided directory, understand its purpose, identify patterns, and create a comprehensive AGENTS.md file that will help future AI agents work more effectively on this codebase.

## Analysis Process

### Phase 1: Directory Structure Analysis
1. **List all files** in the target directory (use `Glob` tool)
2. **Identify the project type** by examining:
   - Configuration files (package.json, tsconfig.json, Cargo.toml, etc.)
   - Directory structure patterns
   - Main entry points
3. **Map the architecture** - understand how files relate to each other

### Phase 2: Code Pattern Discovery
1. **Read key files** to understand:
   - Main functionality and purpose
   - Coding conventions and style
   - Architectural patterns (MVC, layered, modular, etc.)
   - Key dependencies and frameworks used
2. **Identify recurring patterns**:
   - Naming conventions
   - Import/export patterns
   - Error handling approaches
   - Testing patterns (if tests exist)
3. **Look for documentation** in code (comments, JSDoc, etc.)

### Phase 3: Dependency & Relationship Analysis
1. **Identify external dependencies** from config files
2. **Map internal dependencies** - which modules depend on which
3. **Find integration points** - APIs, services, or external systems

### Phase 4: Synthesize Knowledge
Create a comprehensive AGENTS.md with these sections:

```markdown
# AGENTS.md - [Directory/Module Name]

> **Context file for AI agents working on this codebase**

## Overview
[Brief description of what this directory/module does and its role in the larger project]

## Project Type & Stack
- **Type**: [e.g., React frontend, Node.js API, Python microservice]
- **Main Language**: [e.g., TypeScript, Python, Rust]
- **Framework**: [e.g., Next.js, Express, Django]
- **Key Dependencies**: [list 5-10 most important deps]

## Architecture
[Description of the architectural pattern and how code is organized]

### Directory Structure
```
[Tree-like representation of key directories and their purposes]
```

## Coding Patterns & Conventions

### Naming Conventions
- Files: [e.g., kebab-case.ts, PascalCase.tsx]
- Functions: [e.g., camelCase]
- Classes: [e.g., PascalCase]
- Constants: [e.g., UPPER_SNAKE_CASE]

### Code Patterns
[Common patterns found, e.g.:]
- Error handling: [pattern description]
- Async patterns: [e.g., async/await, Promise chains]
- State management: [if applicable]
- Data flow: [how data moves through the system]

## Key Files
| File | Purpose |
|------|---------|
| [filename] | [brief description] |
| [filename] | [brief description] |

## Build & Development
- **Install**: [command]
- **Build**: [command]
- **Test**: [command]
- **Dev Server**: [command]

## Important Notes for Agents
- [Critical context an agent should know]
- [Common pitfalls to avoid]
- [Preferred approaches]

## Dependencies
### Internal
[Other modules/directories this code depends on]

### External
[Key external libraries and their purposes]
```

## Critical Rules

### MUST DO:
- ✅ Use `Glob` to discover files before reading them
- ✅ Actually READ multiple files to understand patterns (not just list them)
- ✅ Be SPECIFIC about patterns found (don't be vague)
- ✅ Include concrete examples when describing patterns
- ✅ Check for existing AGENTS.md first - if it exists, UPDATE it with new insights, don't replace blindly
- ✅ Preserve any valuable information from existing AGENTS.md

### MUST NOT DO:
- ❌ Don't assume patterns - verify by reading files
- ❌ Don't include files in "Key Files" unless you've actually examined them
- ❌ Don't be generic - "uses functions" is not helpful; "uses dependency injection pattern" is
- ❌ Don't delete existing AGENTS.md content without preserving valuable context

## Output

Create or update the file: `$ARGUMENTS/AGENTS.md`

After completion, provide a brief summary:
1. What directory was analyzed
2. Key patterns discovered
3. What was created/updated
4. Any important warnings or notes

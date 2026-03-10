---
description: >
  Analyze a feature or functionality in the codebase. Use when you want
  comprehensive analysis of a feature,

  including backend endpoints, frontend components, database models, and
  business logic. Triggers: analyze, analizar, 

  diagnosticar, feature analysis, codebase analysis, miembros, members,
  colaboradores, collaborators, contratos, contracts.

  Accepts natural language descriptions like "analyze the members functionality"
  or "analizar la funcionalidad de colaboradores".
---

# Feature Analysis Command

Analyze a feature or functionality described in natural language. This command will:

1. **Search comprehensively** across the codebase for related files
2. **Collect implementations** from backend, frontend, and database layers
3. **Analyze completeness** of the feature
4. **Identify bugs, issues, and suggestions**
5. **Generate a structured diagnostic report**

## Usage

```
/analyze [natural language description of the feature]
```

**Examples:**

- `/analyze the members functionality`
- `/analizar la funcionalidad de colaboradores`
- `/analyze contract management`
- `/analizar sistema de pagos`

## Analysis Process

### Step 1: Parse the Request

Extract key entities and concepts from the natural language description:

- Entity names (members, collaborators, contracts, payments, etc.)
- Actions (invite, manage, create, delete, etc.)
- Context (backend, frontend, database, API)

### Step 2: Comprehensive Search

Launch parallel exploration agents to find:

**Backend Layer:**

- API controllers and endpoints
- Service implementations
- DTOs and validation schemas
- Database models/entities
- Repository patterns

**Frontend Layer:**

- React components
- Hooks and state management
- Forms and validation
- API integration code
- UI components

**Database Layer:**

- Prisma schema definitions
- Migration files
- Seed data

**Documentation:**

- Architecture docs
- API documentation
- Feature specifications

### Step 3: Analyze Findings

For each discovered component, analyze:

**Completeness Check:**

- Are all CRUD operations implemented?
- Is validation present?
- Are error handlers in place?
- Is authentication/authorization enforced?

**Code Quality:**

- Type safety
- Error handling
- Edge cases covered
- Consistency with patterns

**Integration Points:**

- API contracts match between frontend and backend
- Database schema aligns with entities
- Tests cover the feature

### Step 4: Generate Diagnostic Report

Structure the report as:

```markdown
# Feature Analysis: [Feature Name]

## Overview

Brief description of what was analyzed.

## Files Discovered

### Backend

| File                    | Type       | Description           |
| ----------------------- | ---------- | --------------------- |
| `path/to/controller.ts` | Controller | API endpoints         |
| `path/to/service.ts`    | Service    | Business logic        |
| `path/to/dto.ts`        | DTO        | Data transfer objects |

### Frontend

| File                    | Type      | Description   |
| ----------------------- | --------- | ------------- |
| `path/to/component.tsx` | Component | UI component  |
| `path/to/hook.ts`       | Hook      | Data fetching |

### Database

| File                    | Type   | Description    |
| ----------------------- | ------ | -------------- |
| `path/to/schema.prisma` | Schema | Database model |

## Completeness Assessment

### ✅ Implemented

- [List of complete features]

### ⚠️ Partial/Missing

- [List of incomplete or missing features]

### ❌ Not Found

- [Expected components that weren't found]

## Issues & Suggestions

### 🐛 Potential Bugs

1. [Issue description with location]
   - **Location:** `file.ts:L42`
   - **Suggestion:** [Fix recommendation]

### 💡 Improvements

1. [Improvement suggestion]
   - **Current:** [What exists now]
   - **Suggested:** [What could be better]

## Architecture Observations

- [Notes on code patterns, consistency, etc.]

## Next Steps

- [Recommended actions]
```

## Execution

Given the feature description: `$ARGUMENTS`

Delegate to the `analyzer` agent to perform comprehensive feature analysis.

### Delegation Prompt

```
TASK: Analyze the feature described in natural language

FEATURE DESCRIPTION: $ARGUMENTS

EXPECTED OUTCOME:
1. Comprehensive search across backend, frontend, and database layers
2. Complete inventory of all related files
3. Completeness assessment (what's implemented vs missing)
4. Bug detection and issue identification
5. Improvement suggestions
6. Structured diagnostic report

REQUIRED APPROACH:
1. Parse the natural language to extract key entities and search terms
2. Search comprehensively using multiple patterns:
   - Backend: controllers, services, DTOs, modules, guards
   - Frontend: components, hooks, pages, API clients
   - Database: Prisma schema, migrations
   - Tests: unit, integration, e2e
3. Read key files to understand implementations
4. Analyze against completeness checklist
5. Detect issues, bugs, and architectural problems
6. Generate structured report with:
   - File inventory organized by layer
   - Completeness assessment
   - Issues categorized by severity
   - Recommendations and next steps

MUST DO:
- Search multiple naming conventions (singular, plural, camelCase, PascalCase, snake_case, kebab-case)
- Include both English and Spanish term variations
- Read file contents, don't just list paths
- Be specific with file paths and line numbers
- Suggest concrete fixes, not just identify problems
- Use tables for organizing file discoveries
- Check for all CRUD operations
- Verify authentication and authorization
- Look for validation, error handling, and tests

MUST NOT DO:
- Only list files without analyzing them
- Make vague suggestions without specifics
- Skip any layer (backend, frontend, or database)
- Assume patterns without verifying

CONTEXT:
This is a codebase analysis. Adapt to the project's specific structure:
- Look for common patterns (NestJS, Express, Fastify for backend)
- Look for React, Vue, Angular patterns for frontend
- Check for ORMs (Prisma, TypeORM, Drizzle) for database
- Identify testing frameworks (Jest, Vitest, Playwright)
```

The analyzer agent will return a comprehensive diagnostic report. Present this report to the user.

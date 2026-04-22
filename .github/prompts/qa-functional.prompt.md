---
description: >
  Generate manual QA functional test cases from a previously analyzed feature.
  Produces a structured checklist with test data for human QA testers. No code,
  no automation — just test case documentation. Triggers: qa-functional, qa
  manual, test cases, casos de prueba, functional testing, manual testing,
  pruebas funcionales, checklist qa. Run /analyze first, then use this command
  to generate test cases.
---

# QA Functional Test Cases Generator

Generate comprehensive manual QA test cases based on the feature analysis from the current conversation.

## Prerequisites

This command **requires** a previous `/analyze` run in the same conversation. The analysis report provides the context (endpoints, components, models, business logic) needed to derive test cases.

If no `/analyze` report is found in the conversation, **stop and tell the user** to run `/analyze [feature]` first.

## Input

```
/qa-functional [optional: additional context or focus areas]
```

`$ARGUMENTS` — Optional extra context (e.g., "focus on edge cases for payments", "include permission scenarios").

## Process

### Step 1: Extract Feature Context

From the `/analyze` report in the conversation, extract:

- **Entities**: Models, schemas, data objects
- **Endpoints/Actions**: CRUD operations, API routes, user actions
- **Business Rules**: Validation, authorization, conditional logic
- **UI Components**: Forms, tables, modals, navigation flows
- **Integration Points**: API contracts, external services, events

### Step 2: Derive Test Scenarios

For **each** endpoint/action/component discovered, generate test cases covering:

**Functional Categories:**

| Category | What to Test |
|----------|-------------|
| **Happy Path** | Normal flow with valid data — the feature works as expected |
| **Validation** | Required fields, format rules, min/max lengths, types |
| **Edge Cases** | Boundary values, empty strings, zero, max limits, special characters |
| **Error Handling** | Invalid input, server errors, network failures, timeouts |
| **Authorization** | Roles, permissions, ownership, forbidden access attempts |
| **State Transitions** | Status changes, workflows, before/after states |
| **Data Integrity** | Duplicates, cascade deletes, referential integrity |
| **Concurrency** | Simultaneous edits, race conditions (if applicable) |

### Step 3: Generate Test Data

For each test case that needs data, include **realistic** test values:

- Names: "Ana Garcia", "Carlos Lopez" (not "Test User 1")
- Emails: "ana.garcia@empresa.com" (not "test@test.com")
- Boundary values: exactly at min, exactly at max, one over, one under
- Special characters: `O'Brien`, `José`, `user+tag@email.com`
- Empty/null variations when testing validation
- Large datasets when testing limits

### Step 4: Prioritize

Assign priority based on business impact:

| Priority | Criteria |
|----------|----------|
| **P0 - Critical** | Core functionality, data loss risk, security |
| **P1 - High** | Main user flows, common operations |
| **P2 - Medium** | Secondary flows, uncommon but valid scenarios |
| **P3 - Low** | Cosmetic, minor edge cases, rare scenarios |

## Output Format

Generate the following structured document:

```markdown
# QA Test Cases: [Feature Name]

**Date:** [today]
**Analyzed by:** AI (from /analyze report)
**Total Cases:** [N]
**Breakdown:** P0: [n] | P1: [n] | P2: [n] | P3: [n]

---

## 1. [Functional Area Name] (e.g., "Create Member")

### TC-001: [Test Case Title]
- **Priority:** P0
- **Preconditions:** [What must be true before the test]
- **Test Data:**
  - Field: value
  - Field: value
- **Steps:**
  1. [Action]
  2. [Action]
  3. [Action]
- **Expected Result:** [What should happen]

### TC-002: [Test Case Title]
...

---

## 2. [Next Functional Area]

### TC-010: [Test Case Title]
...

---

## Summary Table

| ID | Area | Title | Priority | Type |
|----|------|-------|----------|------|
| TC-001 | Create Member | Create with valid data | P0 | Happy Path |
| TC-002 | Create Member | Missing required email | P1 | Validation |
| ... | ... | ... | ... | ... |
```

## Rules

- **NO CODE**: Zero code snippets. This is a document for a human QA tester.
- **EXHAUSTIVE**: Cover every endpoint, action, and component from the analysis.
- **REALISTIC**: Test data must look real, not placeholder garbage.
- **ACTIONABLE**: Steps must be clear enough for someone unfamiliar with the feature.
- **SPANISH FRIENDLY**: If the `/analyze` report was in Spanish, write test cases in Spanish. Otherwise, match the language of the conversation.
- **SEQUENTIAL IDs**: Use TC-001, TC-002, etc. globally across all areas.
- **INCLUDE NEGATIVE CASES**: At least 40% of test cases should be negative/edge cases.
- **GROUP BY AREA**: Match the functional areas from the `/analyze` report.

## Additional Context

$ARGUMENTS

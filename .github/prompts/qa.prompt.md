---
description: Run QA manual testing using the qamanual skill. Analyzes code,
  creates test checklists, executes Playwright tests, and reports bugs.
---

Load the  skill(qamanual) and execute manual QA testing for the following task:

$ARGUMENTS

Follow the qamanual skill workflow:
1. **Analyze Source Code** - Find component files and identify available selectors
2. **Detect Environment** - Find running dev servers
3. **Create Test Checklist** - Generate structured test plan in `.qamanual/`
4. **Execute Tests** - Run Playwright tests with screenshot capture
5. **Report Results** - Generate findings with bug reports and fix suggestions

**Important**:
- Always analyze the source code first to understand selectors
- Create the checklist before writing any test code
- Update the checklist in real-time as tests execute
- Take screenshots at every critical step
- Use `look_at` to analyze screenshots for visual bugs

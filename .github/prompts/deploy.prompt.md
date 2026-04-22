---
description: Find and execute the deploy.yml GitHub Actions workflow, monitor
  the pipeline and verify if it passes or fails
---

# Deploy Workflow Runner

Finds the `deploy.yml` workflow in `.github/workflows/`, runs it and monitors until completion.

## Context
$ARGUMENTS

## Process

### 1. Find Workflow
- Look for `.github/workflows/deploy.yml` in current directory
- If not found, search for any `*deploy*.yml` file
- Display found workflows

### 2. Execute Workflow
```bash
gh workflow run deploy.yml
```

### 3. Monitor Execution
- Get the most recent run ID:
```bash
gh run list --workflow=deploy.yml --limit=1 --json databaseId,status,conclusion,createdAt
```

- Monitor until completion (poll every 10 seconds):
```bash
gh run view {run_id} --json status,conclusion
```

### 4. Verify Result
- If `conclusion` == `success`: ✅ Pipeline successful
- If `conclusion` == `failure`: ❌ Pipeline failed
- If `conclusion` == `cancelled`: ⚠️ Pipeline cancelled
- If `conclusion` == `skipped`: ⏭️ Pipeline skipped

### 5. Show Logs (if failed)
If the pipeline failed, display error logs:
```bash
gh run view {run_id} --log-failed
```

## Expected Output

```
🔍 Looking for deploy.yml workflow...
✅ Workflow found: .github/workflows/deploy.yml

🚀 Running workflow...
✅ Workflow started (Run ID: 1234567890)

⏳ Monitoring execution...
   Status: in_progress... (00:00:15)
   Status: in_progress... (00:00:30)
   Status: completed ✅

📊 Result:
   ✅ Pipeline PASSED successfully
   ⏱️  Duration: 45 seconds
   🔗 URL: https://github.com/.../actions/runs/1234567890
```

Or in case of error:
```
❌ Pipeline FAILED
   📋 Showing error logs...
   [logs here]
```

## Rules
- ✅ Always verify `gh` CLI is installed and authenticated
- ✅ Actively wait for pipeline to complete (don't stop)
- ✅ Show real-time progress
- ✅ In case of failure, automatically show detailed logs
- ✅ Report success/failure clearly at the end

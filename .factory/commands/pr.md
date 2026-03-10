---
description: Create a pull request using GitHub CLI
---

# Create Pull Request

## Current Branch Context:
!`echo "Current branch: $(git branch --show-current)" && echo "---" && git status --porcelain && echo "---" && git log --oneline -5`

## Target Branch:
$ARGUMENTS

**Default target:** `develop` (if no argument provided)

## Process:
1. Detect current branch and compare with target branch
2. Generate PR title from recent commits (conventional commits format)
3. Generate PR body from commit messages
4. Create PR using GitHub CLI

## Execution:
Run the following command to create the PR:
```bash
gh pr create --base $(echo "$ARGUMENTS" | sed 's/^$/develop/') --title "PR Title" --body "PR Body"
```

## Output:
After generating the PR, provide:
- PR URL
- PR number
- Link to review

**Note:** If there are uncommitted changes, stage them first or stash before creating the PR.

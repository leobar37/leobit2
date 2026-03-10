---
description: Create commit with conventional commits format and push to remote
---

# Git Commit and Push

Your task is to create an appropriate git commit message following **Conventional Commits** specification, then commit and push the changes.

## Quick Analysis:
!`git status --porcelain && echo "---" && git diff --cached --stat && echo "---" && git log --oneline -3`

## Additional Context:
$ARGUMENTS

## Process:
1. Generate commit message following conventional commits
2. Stage all changes if not staged
3. Commit with the generated message  
4. Push to remote

## Conventional Commits Format:
```
<type>[optional scope]: <description>

[optional body]
```

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
**Rules:** Present tense, imperative mood, <50 chars first line, no period
**IMPORTANT:** NEVER include "Co-authored by", "Signed-off-by", or any multi-author attribution in commit messages. Commit must be clean with single author only.

## Execute:
After generating the message, run:
```bash
git add -A
git commit -m "your_message"
git push origin HEAD
```

Generate the commit message and execute the commit+push workflow.

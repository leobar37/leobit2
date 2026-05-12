# Landing Multi Business Worktree Recommendations

## Strategy

Use one primary worktree for the foundation and final QA. Parallel worktrees are only useful after `F-001` stabilizes the vocabulary and claim boundaries.

Because the initiative touches a small landing surface, parallelization should be conservative to avoid conflicting edits in `landing.tsx`, `features-grid.tsx`, and shared copy.

## Recommended Worktree Matrix

| Feature ID | Recommended | Branch Name | Worktree Path | Rationale |
| --- | --- | --- | --- | --- |
| `F-001` | no | `feature/landing-multi-business-positioning` | n/a | Foundational copy decisions should be reviewed before downstream edits. |
| `F-002` | yes | `feature/landing-hero-seo` | `../wt-landing-hero-seo` | Mostly metadata, hero and navigation; can be isolated after `F-001`. |
| `F-003` | yes | `feature/landing-paper-benefits` | `../wt-landing-paper-benefits` | Mostly feature benefits copy; can run beside use-cases after `F-001`. |
| `F-004` | yes | `feature/landing-use-cases` | `../wt-landing-use-cases` | New section/component can be isolated with limited route composition changes. |
| `F-005` | no | `feature/landing-flow-multirubro` | n/a | Reworks the existing flow and should align with finalized use-case labels. |
| `F-006` | yes | `feature/landing-social-faq-cta` | `../wt-landing-social-faq-cta` | Mostly lower-page copy after use-case labels are known. |
| `F-007` | no | `feature/landing-qa-visual-seo` | n/a | Final QA must validate integrated output. |

## Parallel Waves

1. Wave 1: `F-001`
2. Wave 2: `F-002`, `F-003`, `F-004`
3. Wave 3: `F-005`, `F-006`
4. Wave 4: `F-007`

## Operational Notes

- Recommendations only. Do not create branches or worktrees automatically.
- Re-check `git status` before future branch/worktree operations.
- Avoid parallel edits to `packages/app/app/routes/landing.tsx` without coordination.
- If working in a single session, execute features sequentially to reduce merge noise.

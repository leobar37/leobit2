# Plan: Organize drizzle-sync Docs

## Objective

Create an `index.md` in `packages/drizzle-sync/docs/` and optionally rename existing numbered files to use the naming convention the user requested.

## Context

The `packages/drizzle-sync/docs/` folder already contains 11 well-written documents covering quickstart, architecture, concepts, advanced, configuration, API reference, etc. The user wants:

1. `how-to-use.md` — aligns with `01-quickstart.md`
2. `architecture.md` — aligns with `02-architecture.md`
3. `how-to-extend.md` — aligns with `08-advanced.md`
4. `how-to-understand.md` — aligns with `06-concepts.md`
5. `index.md` — navigation index (does not exist yet)

## Scope

### In Scope
- Create `docs/index.md` as the navigation entry point
- Rename existing docs to match the user's preferred naming convention (or keep numbering and add symlinks/descriptions in index)

### Out of Scope
- Rewriting existing doc content
- Adding new documentation beyond reorganization

## Files to Create

### `packages/drizzle-sync/docs/index.md`

Navigation index that links to all docs and groups them by purpose:

```
drizzle-sync/
├── index.md                    ← NEW: navigation entry point
├── how-to-use.md              ← rename from 01-quickstart.md
├── architecture.md            ← rename from 02-architecture.md
├── concepts.md OR how-to-understand.md  ← from 06-concepts.md
├── how-to-extend.md           ← rename from 08-advanced.md
├── 03-backend-config.md       ← keep (backend reference)
├── 04-cli.md                  ← keep (CLI reference)
├── 05-frontend-react.md      ← keep (frontend reference)
├── 07-api-reference.md       ← keep (API reference)
├── 09-configuration.md       ← keep (configuration reference)
├── 10-file-handling.md        ← keep (file handling)
└── 11-migration-v2.md         ← keep (migration guide)
```

## Steps

### Step 1: Create `index.md`
Write `packages/drizzle-sync/docs/index.md` with:
- Title and brief description of the framework
- Grouped list of docs by audience/purpose:
  - **Getting Started**: how-to-use, architecture
  - **Understanding**: how-to-understand (concepts)
  - **Extending**: how-to-extend
  - **Reference**: backend-config, cli, frontend-react, api-reference, configuration, file-handling, migration-v2
- Quick links to most common paths

### Step 2: Rename files (or create symlinks)

Option A — **Rename files** (cleaner for readers):
```bash
mv 01-quickstart.md how-to-use.md
mv 02-architecture.md architecture.md
mv 06-concepts.md how-to-understand.md
mv 08-advanced.md how-to-extend.md
```

Option B — **Keep numbered files, add index** (preserves git history):
- Skip renaming
- Update `index.md` to reference the numbered files with descriptions

Recommendation: Option B (preserve git history of existing docs).

## Verification

- [ ] `docs/index.md` exists and is valid markdown
- [ ] All existing docs are linked from `index.md`
- [ ] Groups are logical (Getting Started, Understanding, Extending, Reference)

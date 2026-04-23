# Plan: README for `@avileo/drizzle-sync`

## Objective
Create a comprehensive, production-ready README.md for the `@avileo/drizzle-sync` library.

## Verified Context
- Package: `packages/drizzle-sync`
- CLI entry: `src/cli.ts` (Commander.js)
- 9 submodules with separate exports
- Code generation from Drizzle schema to frontend code
- Real usage in `packages/backend/src/sync.config.ts` and `packages/app/app/lib/sync/`
- No existing README in the package

## Target Audience
- Full-stack TypeScript developers building offline-first apps
- Teams using Drizzle ORM + PostgreSQL + React
- Developers evaluating sync solutions

## README Structure Plan

### 1. Header Section
- Package name with description
- Badges (npm version, license, build status if applicable)
- One-line pitch: "Drizzle-first offline sync engine for PostgreSQL → PGlite"

### 2. What is this?
- 2-3 paragraph explanation
- Problem it solves (offline-first sync without complexity)
- Architecture diagram (ASCII or mermaid)
- Key differentiators vs alternatives (ElectricSQL, PowerSync, etc.)

### 3. Features
- Bidirectional sync (push/pull)
- Conflict resolution (version-based, last-write-wins, merge)
- Staged data loading (CRITICAL → RECENT → HISTORICAL)
- Code generation from Drizzle schema
- React integration with hooks
- Multi-tenancy support
- Dead letter queue
- Operation coalescing
- Self-healing errors

### 4. Installation
```bash
npm install @avileo/drizzle-sync
# peer dependencies
npm install drizzle-orm @electric-sql/pglite react zod
```

### 5. Quick Start (5-minute guide)
Step 1: Define sync config in backend
Step 2: Run CLI to generate frontend code
Step 3: Initialize client engine in frontend
Step 4: Wrap app with React provider

### 6. Architecture Overview

#### Submodules
```
@avileo/drizzle-sync
├── /core     - Runtime-agnostic types & interfaces
├── /shared   - Constants & utilities
├── /config   - Schema introspection & code generation
├── /server   - PostgreSQL sync engine (backend)
├── /pglite   - PGlite adapters (frontend)
├── /client   - Framework-agnostic client engine
├── /react    - React hooks & providers
├── /codecs   - Field serialization
└── /cli      - Code generation CLI
```

### 7. Backend Configuration
Full example based on `packages/backend/src/sync.config.ts`:
- `defineSyncConfig()` with entities
- Field codecs (currency, weight)
- Relations (parent/children)
- Tenancy config
- Conflict resolution strategies

### 8. CLI Reference
```bash
drizzle-sync build-schema   # Build sync.schema.json from config
drizzle-sync generate       # Generate all frontend code
drizzle-sync validate       # Validate schema
drizzle-sync clean          # Remove generated files
```

Document all flags (-c, -o, -s, --dry-run)

### 9. Frontend Usage (React)
Based on `packages/app/app/lib/sync/service-provider.tsx`:
- `createSyncClientEngine()` initialization
- `SyncProvider` wrapping
- `useSyncState()` hook
- `useSyncStatus()` hook
- Service access pattern

### 10. API Reference (per submodule)
Brief exports list for each submodule with 1-line descriptions.

### 11. Key Concepts
- **Sync Operations**: create/update/delete queue
- **Push Sync**: Client → Server flow
- **Pull Sync**: Server → Client flow
- **Conflict Resolution**: Version-based with strategies
- **Staged Pull**: Initial sync in 3 stages
- **Dead Letter Queue**: Failed operations handling
- **Operation Coalescing**: Merge duplicate ops
- **Self-Healing**: Auto-recovery patterns

### 12. Advanced Examples
- Custom conflict resolver
- Manual sync trigger
- Offline detection
- Schema migrations
- Custom codecs

### 13. Configuration Reference
Full `SyncConfig` interface documentation with all options.

### 14. Decision Matrix (When to use)
| Scenario | Solution |
|----------|----------|
| Full offline-first | Use complete stack |
| Just backend sync | `@avileo/drizzle-sync/server` |
| Just client engine | `@avileo/drizzle-sync/client` |
| Custom frontend | `@avileo/drizzle-sync/core` + custom impl |

### 15. Contributing / Development
- Link to main repo
- How to run tests: `cd packages/drizzle-sync && bun test`
- Build: `bun run build`

### 16. License
MIT (or whatever the repo uses)

## Style Guidelines
- Mobile-friendly formatting (short lines)
- Code blocks with ts/bash syntax
- Mermaid diagrams where helpful
- Real examples from Avileo codebase
- Links to sub-AGENTS.md files for deep dives

## Open Questions
1. Should we include a comparison table with ElectricSQL/PowerSync?
2. Should we document the sync protocol (REST endpoints)?
3. Should we include a troubleshooting section?
4. What license does the project use?

## Implementation Notes
- Write to: `packages/drizzle-sync/README.md`
- Length target: ~300-400 lines (comprehensive but scannable)
- Include table of contents
- Use the actual `sync.config.ts` as the primary example
- Reference actual generated files structure

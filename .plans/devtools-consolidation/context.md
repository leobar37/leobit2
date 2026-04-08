# Devtools Consolidation — Context

## Overview

Consolidate all devtools code into a single `app/devtools/` folder, fix the `window.avileoDebug` collision bug, and remove debug code from `provider.tsx`. The work is confined to `packages/app` (frontend only).

## Background

`window.avileoDebug` is assigned twice from two independent locations:

1. `EngineProvider` `useEffect` (`provider.tsx:63`) — sets low-level PGlite helpers (`getProducts`, `copyDiagnosticReport`, `checkAllTables`, etc.)
2. `ServicesProvider` via `registerDebugServices()` (`service-provider.tsx:197`) — sets service-layer helpers (`purchases`, `products`, `customers`, etc.)

The second assignment silently overwrites the first, breaking `SyncDevToolsDrawer.handleCopyReport` which calls `avileoDebug.copyDiagnosticReport()` (an engine-level helper that no longer exists after the overwrite).

Additionally, devtools code is spread across:
- `app/lib/debug.ts` — console helpers (460 lines)
- `app/components/debug/` — DebugWidget, DebugActions UI
- `app/components/sync/sync-devtools/` — SyncDevToolsDrawer and supporting files
- `app/engine/provider.tsx` — inline `window.avileoDebug` setup (133 lines)

## Goal

A single `app/devtools/` folder that owns all devtools, with one `initDevTools()` function that merges engine-level and service-level helpers onto `window.avileoDebug` without collision. `provider.tsx` no longer contains any debug code.

## Key Decisions

- New home: `app/devtools/` (not nested under `engine/`)
- Single `initDevTools({ pg })` call from `provider.tsx` after `initDatabase()` succeeds
- `registerDebugServices()` is removed; its helpers are merged into `initDevTools()`
- All devtools UI components (`DebugWidget`, `DebugActions`, `SyncDevToolsDrawer`) re-exported from `app/devtools/`
- `import.meta.env.DEV` gating is **not** added in this phase (deferred to a future improvement)

## Scope Boundaries

- In scope: `packages/app` frontend only; `window.avileoDebug` consolidation; `provider.tsx` cleanup; devtools UI component reorganization
- Out of scope: tree-shaking / DEV-only gating; production bundle optimization; backend changes

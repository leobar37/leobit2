# DevTools Sync Improvements - Context

## Overview

Enhance the developer experience for debugging and monitoring Avileo's offline-first sync system. The current DevTools provide basic visibility into sync operations, but lack advanced debugging capabilities like timeline visualization, performance metrics, and operational analytics.

This plan adds 7 major improvements to the DevTools across multiple phases:
1. Operations Tab enhancements (filters, sorting)
2. Health Score visualization
3. New console helpers
4. Timeline view
5. Metrics dashboard
6. Data export functionality
7. Performance monitoring

## Background

Avileo uses a custom REST-based sync system with PGlite for offline storage. The sync engine handles:
- **Push sync**: Client changes → Server (via sync_operations queue)
- **Pull sync**: Server changes → Client (via staged pull with cursors)
- **Conflict resolution**: Server-side with client-side UI
- **Dead Letter Queue**: Failed operations after max retries

Current DevTools (`packages/app/app/devtools/`) provide:
- `SyncDevToolsDrawer`: 5 tabs (Status, Operations, DLQ, Tables, Database)
- `DebugWidget`: Floating debug panel with quick actions
- `window.avileoDebug`: Console helpers for data inspection

## Goal

Provide comprehensive visibility into sync system health and performance, enabling developers to:
- Quickly identify sync issues and bottlenecks
- Understand sync patterns over time
- Export diagnostic data for analysis
- Debug specific operation failures

## Key Decisions

- **No backend changes**: All improvements are frontend-only
- **Leverage existing sync-events**: Use the event system for timeline/metrics
- **Maintain Dev-only**: These tools remain development-only (not user-facing)
- **Phase 1 = Quick wins**: Start with UI improvements before data architecture changes

## Scope Boundaries

- **In scope**: DevTools UI components, console helpers, sync event consumption
- **Out of scope**: Changes to sync engine logic, backend APIs, production monitoring
- **Out of scope**: User-facing sync status UI (already exists in background-sync-badge)

## Current Architecture Reference

| Component | Path | Purpose |
|-----------|------|---------|
| SyncDevToolsDrawer | `devtools/sync/drawer.tsx` | Main drawer with 5 tabs |
| StatusTab | `devtools/sync/tabs/status-tab.tsx` | Health status + stat cards |
| OperationsTab | `devtools/sync/tabs/operations-tab.tsx` | Problem operations list |
| DLQTab | `devtools/sync/tabs/dlq-tab.tsx` | Dead letter queue |
| TablesTab | `devtools/sync/tabs/tables-tab.tsx` | Entity summaries |
| DatabaseTab | `devtools/sync/tabs/database-tab.tsx` | PGlite stats |
| useDevToolsData | `devtools/sync/hooks/use-devtools-data.ts` | Data fetching |
| syncEvents | `lib/sync/sync-events.ts` | Event emitter |
| useSyncState | `lib/sync/service-provider.tsx` | React state hook |

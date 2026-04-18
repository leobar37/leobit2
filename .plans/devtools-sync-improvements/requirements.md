# DevTools Sync Improvements - Requirements

## Objective

Enhance the sync debugging and monitoring capabilities of Avileo's DevTools to provide developers with comprehensive visibility into sync system health, performance metrics, and operational patterns.

## Scope

- **In scope**:
  - UI improvements to existing DevTools tabs
  - New DevTools tabs (Timeline, Metrics, Performance)
  - Enhanced console helpers (`window.avileoDebug`)
  - Data export functionality
  - Sync health scoring
  
- **Out of scope**:
  - Changes to sync engine implementation
  - Backend API modifications
  - Production monitoring/alerting systems
  - User-facing sync status UI

## Functional Requirements

- `FR-001` - Operations Tab Filtering: Allow filtering operations by status (pending, processing, failed, conflict), entity type, age, and retry count
- `FR-002` - Operations Tab Sorting: Support sorting operations by age (newest/oldest), retry count, and entity type
- `FR-003` - Sync Health Score: Calculate and display a 0-100 health score based on failed operations, conflicts, DLQ entries, and consecutive failures
- `FR-004` - Health Status Visualization: Color-coded health indicator (healthy/warning/critical) with trend indicator
- `FR-005` - Timeline View: Display chronological sync events (pull completed, push started, conflicts, errors) in a scrollable timeline
- `FR-006` - Metrics Dashboard: Show aggregate metrics including sync latency, pull duration, queue age, conflict rate, DLQ rate, and entity breakdown
- `FR-007` - Data Export: Export sync operations, metrics, and timeline events to JSON format for external analysis
- `FR-008` - Console Helpers: Add `sync.timeline()`, `sync.metrics()`, `sync.analyzeConflicts()`, `sync.findStuckOps()`, `sync.exportReport()` helpers
- `FR-009` - Performance Tab: Display PGlite query times, sync batch processing duration, and memory usage
- `FR-010` - "Approaching DLQ" Warning: Highlight operations with 3+ retry attempts (near MAX_RETRIES=5)

## Non-Functional Requirements

- `NFR-001` - Performance: DevTools must not degrade app performance; use lazy loading for heavy tabs
- `NFR-002` - Memory: In-memory event buffer should be capped (max 500 events) to prevent memory leaks
- `NFR-003` - Responsiveness: UI must remain responsive during sync operations; use virtualization for long lists
- `NFR-004` - Dev-only: All DevTools code must be tree-shaken in production builds

## Acceptance Criteria

- [ ] Operations tab allows filtering by status, entity, and age
- [ ] Health score displays 0-100 with color-coded indicator
- [ ] Timeline shows at least last 50 sync events with timestamps
- [ ] Metrics dashboard displays 6+ calculated metrics
- [ ] Export generates valid JSON with operations + metrics
- [ ] All new console helpers work in browser dev console
- [ ] Performance tab shows query timing data
- [ ] Operations with 3+ retries show warning badge

## Constraints

- Must use existing sync event system (`syncEvents` emitter)
- Must work with current PGlite database schema (no migrations)
- Must remain compatible with current sync service interfaces
- DevTools are development-only; no user-facing impact

## Open Questions

- Should Timeline persist across page reloads (localStorage) or be session-only?
- Should Metrics calculate rolling averages or use fixed time windows?
- Should Export include sensitive data (business IDs) or anonymize?

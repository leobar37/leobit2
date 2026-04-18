# T-003 Enhanced Console Helpers

## Objective

Add new debugging helpers to `window.avileoDebug` for advanced sync analysis.

## Requirements Covered

- `FR-008` - Console Helpers

## Dependencies

- none

## Files or Areas Involved

- `devtools/console/service-helpers.ts` - Modify - Add new helpers
- `devtools/console/index.ts` - Review - Ensure helpers are exported

## Actions

1. Add `sync` namespace to service helpers with these methods:
   - `timeline(maxEvents = 50)` - Return recent sync events from syncEvents buffer
   - `metrics()` - Calculate and return sync metrics (latency, rates, etc.)
   - `analyzeConflicts()` - Break down conflicts by entity type and error pattern
   - `findStuckOps(minAgeMinutes = 60)` - Find pending operations older than threshold
   - `retryAllFailed()` - Re-enqueue all failed operations (with confirmation)
   - `exportReport()` - Generate full diagnostic report as JSON
2. Update `help()` command to list new sync.* helpers
3. Add TypeScript declarations for new methods
4. Ensure helpers gracefully handle uninitialized services

## Completion Criteria

- [ ] All 6 sync helpers available in console
- [ ] `avileoDebug.help()` shows sync.* commands
- [ ] Helpers return useful data structures (not just console.log)
- [ ] Helpers handle edge cases (no data, uninitialized)

## Validation

- Test in browser console: `avileoDebug.sync.help()` shows all commands
- Test: `avileoDebug.sync.timeline()` returns array of events
- Test: `avileoDebug.sync.findStuckOps()` with pending operations > 1h old

## Risks or Notes

- `retryAllFailed()` should require confirmation to prevent accidental mass retries
- Timeline requires events to be stored; may need to add event buffering

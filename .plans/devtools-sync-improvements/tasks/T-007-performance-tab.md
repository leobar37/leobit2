# T-007 Performance Monitoring Tab

## Objective

Create a new "Performance" tab showing PGlite and sync operation timing metrics.

## Requirements Covered

- `FR-009` - Performance Tab

## Dependencies

- none (can be done in parallel)

## Files or Areas Involved

- `devtools/sync/tabs/performance-tab.tsx` - Create - Performance dashboard
- `devtools/sync/hooks/use-performance-metrics.ts` - Create - Performance tracking hook
- `devtools/sync/drawer.tsx` - Modify - Add Performance tab
- `lib/sync/sync-service.ts` - Modify - Add timing instrumentation (if needed)

## Actions

1. Create `PerformanceMetrics` type with:
   - queryTimings (PGlite query durations)
   - batchProcessingTime (sync batch duration)
   - memoryUsage (JS heap size)
   - storageUsage (IndexedDB size via navigator.storage.estimate)
   - serviceInitTimes (push/pull/coordinator init from existing logs)
2. Create `usePerformanceMetrics` hook that:
   - Uses existing performance logs from ServicesProvider
   - Wraps PGlite queries for timing (or uses existing logs)
   - Reads navigator.memory (Chrome only) for JS heap
   - Gets storage estimate every 30s
3. Create `PerformanceTab` with sections:
   - **Query Performance**: Average, min, max query times; slowest queries list
   - **Sync Performance**: Batch processing times, operations/second
   - **Memory**: JS heap usage, trend chart (if multiple readings)
   - **Storage**: IndexedDB usage, quota, available space
   - **Init Times**: Push/pull/coordinator startup durations
4. Add tab to drawer

## Completion Criteria

- [ ] Query timing data displayed (or "instrumentation needed" message)
- [ ] Memory usage shows current heap size
- [ ] Storage shows IndexedDB usage vs quota
- [ ] Init times show service startup durations
- [ ] Data refreshes every 5 seconds

## Validation

- Test: Open tab, verify performance numbers appear
- Test: Create many operations, watch memory usage
- Test: Export large data set, verify storage usage increases

## Risks or Notes

- PGlite timing instrumentation may need to be added to core services
- navigator.memory only available in Chrome; handle gracefully in other browsers
- Frequent storage.estimate() calls may have performance cost; throttle appropriately

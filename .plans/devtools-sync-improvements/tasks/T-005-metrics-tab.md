# T-005 Metrics Dashboard Tab

## Objective

Create a new "Metrics" tab with calculated sync performance indicators.

## Requirements Covered

- `FR-006` - Metrics Dashboard

## Dependencies

- `T-002` (shares calculation approach)
- `T-004` (may share data source)

## Files or Areas Involved

- `devtools/sync/tabs/metrics-tab.tsx` - Create - Dashboard component
- `devtools/sync/hooks/use-sync-metrics.ts` - Create - Metrics calculation hook
- `devtools/sync/components/metric-card.tsx` - Create - Reusable metric card
- `devtools/sync/drawer.tsx` - Modify - Add Metrics tab

## Actions

1. Create `SyncMetrics` type with fields:
   - syncLatency (avg ms from enqueue to completed)
   - pullDuration (avg ms per pull request)
   - queueAge (minutes of oldest pending op)
   - conflictRate (% of operations)
   - dlqRate (% of operations)
   - entityBreakdown (counts per entity type)
   - operationsPerHour (throughput)
   - onlineRatio (% time online)
2. Create `useSyncMetrics` hook that:
   - Calculates metrics from operations + timeline events
   - Uses rolling window (last 1 hour default)
   - Updates every 10 seconds
   - Provides trend comparison (vs previous window)
3. Create `MetricCard` component with:
   - Value (large number)
   - Label
   - Trend indicator (↑↓ same value)
   - Color coding for thresholds
4. Create `MetricsTab` with grid of metric cards + entity breakdown chart
5. Add to drawer tabs

## Completion Criteria

- [ ] 8+ metrics displayed in dashboard
- [ ] Metrics update automatically (10s interval)
- [ ] Trend indicators show change vs previous period
- [ ] Entity breakdown shows distribution
- [ ] Time window selector (1h | 6h | 24h)

## Validation

- Test: Create operations, verify latency metric increases
- Test: Stay offline for 5min, verify onlineRatio decreases
- Test: Change time window, metrics recalculate

## Risks or Notes

- Metric calculations may be CPU intensive with many operations; consider memoization
- Rolling window requires timestamp filtering on each update

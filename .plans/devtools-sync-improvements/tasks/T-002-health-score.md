# T-002 Health Score Visualization

## Objective

Calculate and display a sync health score (0-100) with visual indicators in the StatusTab.

## Requirements Covered

- `FR-003` - Sync Health Score
- `FR-004` - Health Status Visualization

## Dependencies

- `T-001` (for consistent filtering approach, can be done in parallel)

## Files or Areas Involved

- `devtools/sync/tabs/status-tab.tsx` - Modify - Add health score section
- `devtools/sync/hooks/use-health-score.ts` - Create - Calculate health score
- `devtools/sync/types.ts` - Modify - Add HealthScore type

## Actions

1. Create `HealthScore` type with score (0-100), status ('healthy'|'warning'|'critical'), factors array
2. Create `useHealthScore` hook that consumes `useSyncState` and calculates:
   - Base score: 100
   - Deduct: failed * 5 points
   - Deduct: conflict * 3 points
   - Deduct: deadLetter * 10 points
   - Deduct: consecutiveFailures * 2 points
   - Deduct: queueAgeHours * 2 points (if oldest pending > 1h)
   - Floor at 0, ceiling at 100
3. Add health score section to StatusTab with:
   - Large score number (e.g., "87/100")
   - Color-coded badge (green 80-100, yellow 50-79, red 0-49)
   - Breakdown list showing deductions per factor
   - Trend indicator (improving/stable/degrading vs last check)
4. Replace existing healthStatus logic with useHealthScore

## Completion Criteria

- [ ] Health score calculates correctly based on all factors
- [ ] Color coding matches score ranges
- [ ] Factor breakdown shows specific deductions
- [ ] Trend indicator updates when score changes
- [ ] Health section updates in real-time (2s interval)

## Validation

- Test: Manually trigger failures, watch score decrease
- Test: Reset sync (clear operations), verify score returns to 100
- Verify: Score never goes below 0 or above 100

## Risks or Notes

- Score algorithm may need tuning; document formula in comments
- Consider caching last score to calculate trend

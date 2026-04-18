# T-001 Operations Tab Filters and Sorting

## Objective

Add comprehensive filtering and sorting capabilities to the OperationsTab for better debugging of sync operations.

## Requirements Covered

- `FR-001` - Operations Tab Filtering
- `FR-002` - Operations Tab Sorting
- `FR-010` - "Approaching DLQ" Warning

## Dependencies

- none

## Files or Areas Involved

- `devtools/sync/tabs/operations-tab.tsx` - Modify - Add filter UI and sorting controls
- `devtools/sync/components/operation-row.tsx` - Modify - Add warning badge for high retry counts
- `devtools/sync/hooks/use-operation-filters.ts` - Create - Hook for filter/sort logic

## Actions

1. Create `useOperationFilters` hook that manages filter state (status, entity, age, minRetries) and sorting (field, direction)
2. Add filter UI to OperationsTab with:
   - Status dropdown: All | Pending | Processing | Failed | Conflict
   - Entity type dropdown: All | customers | sales | products | etc.
   - Age filter: < 1min | < 1h | < 1d | > 1d
   - Min retries input (default 0, highlights approaching DLQ when >= 3)
3. Add sort controls: Age ↑↓ | Retries ↑↓ | Entity ↑↓
4. Modify OperationRow to show orange warning badge when `sync_attempts >= 3`
5. Update filtered operations display to apply filters + sorting

## Completion Criteria

- [ ] All 4 filter types work independently and combined
- [ ] Sorting works on all 3 fields in both directions
- [ ] Operations with >= 3 retries show warning badge
- [ ] Filter state resets when tab changes
- [ ] UI remains responsive with 100+ operations

## Validation

- Manual testing: Open DevTools, create various operations, verify filters work
- Test edge case: Filter to "conflict" status with no results shows empty state
- Test edge case: Sorting by retries descending shows highest retry counts first

## Risks or Notes

- Watch for performance with large operation lists; consider virtualization if > 200 items
- Filter dropdowns need to handle all 14+ entity types dynamically

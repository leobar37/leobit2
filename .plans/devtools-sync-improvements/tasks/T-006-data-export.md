# T-006 Data Export Functionality

## Objective

Add export functionality to download sync diagnostic data as JSON.

## Requirements Covered

- `FR-007` - Data Export

## Dependencies

- `T-005` (uses metrics data)

## Files or Areas Involved

- `devtools/sync/components/export-dialog.tsx` - Create - Export options dialog
- `devtools/sync/hooks/use-export-data.ts` - Create - Export logic hook
- `devtools/sync/drawer.tsx` - Modify - Add export button to header

## Actions

1. Create `ExportOptions` type with includeOperations, includeMetrics, includeTimeline, timeRange
2. Create `useExportData` hook that:
   - Gathers operations from syncService
   - Collects metrics from useSyncMetrics
   - Gets timeline events
   - Anonymizes sensitive data (optional flag)
   - Generates JSON blob
3. Create `ExportDialog` component with:
   - Checkboxes for data types to include
   - Time range selector (last hour | last 24h | all time)
   - Anonymize toggle (remove business IDs)
   - Preview of export size
   - Download button
4. Add export button to drawer header (next to "Reporte" button)

## Completion Criteria

- [ ] Export dialog opens from drawer header
- [ ] All 3 data types selectable independently
- [ ] JSON export downloads successfully
- [ ] Exported data is valid JSON with proper structure
- [ ] Anonymize option removes sensitive fields

## Validation

- Test: Export with all types, verify JSON structure
- Test: Import exported JSON into JSON viewer validates
- Test: Anonymize checked removes business_id fields

## Risks or Notes

- Large exports (1000+ operations) may be slow; add progress indicator
- Consider adding CSV format for spreadsheet analysis
- Export may contain sensitive data; warn user
